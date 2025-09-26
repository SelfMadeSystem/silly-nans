import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { useEffect, useRef, useState } from 'react';

const vs = /* glsl */ `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
}
`;

const fs = /* glsl */ `
#version 300 es
// Yoinked from https://www.shadertoy.com/view/ldsBRs
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_audioData;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse; // Optional, if you want mouse input

#define PI 3.141592654
#define HASHSCALE1 .1031
#define HASHSCALE3 vec3(.1031, .1030, .0973)
#define HASHSCALE4 vec4(1031, .1030, .0973, .1099)

float hash11(float p) {
    vec3 p3  = fract(vec3(p) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 hash21(float p) {
    vec3 p3 = fract(vec3(p) * HASHSCALE3);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx+p3.yz)*p3.zy);
}
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * HASHSCALE3);
    p3 += dot(p3, p3.yxz+19.19);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}
vec3 hash31(float p) {
    vec3 p3 = fract(vec3(p) * HASHSCALE3);
    p3 += dot(p3, p3.yzx+19.19);
    return fract((p3.xxy+p3.yzz)*p3.zyx); 
}

vec3 decode(vec2 n) {
    float z = .5 - dot(n, n);
    return vec3(n * sqrt(z + .5), z) * 2.;
}

vec2 encode(vec3 n) {
    return n.xy / sqrt(n.z * 2.0 + 2.0);
}

vec3 r(vec3 v, vec2 r) {
    vec4 t = sin(vec4(r, r + PI*0.5));
    vec4 g = vec4(v, dot(v.yz, t.yw));
    return vec3(
        g.x * t.z - g.w * t.x,
        g.y * t.w - g.z * t.y,
        g.x * t.x + g.w * t.z
    );
}

void main() {
    vec2 i = gl_FragCoord.xy;
    vec2 size = u_resolution * 0.5;
    vec2 uv = (i - size) / size.y;
    vec3 s = decode(uv);
    // If you want mouse input, pass it as u_mouse
    vec2 m = 2.0 * (u_mouse - size) / size.y;
    float a = atan(uv.x, uv.y) / PI;
    float g = hash11(floor(a * 10.0));
    float f1 = texture(u_audioData, vec2(hash11(floor(a * 30.0)), 0.2)).r;
    float f = texture(u_audioData, vec2(length(uv) * 0.3 + max(f1, 0.5) * (g + 0.5) * 0.1, 0.2)).r;
    s = r(s, vec2(0.05, -0.1) + vec2(f * pow(2.0 - length(uv), 2.0)));
    vec2 nuv = encode(s);
    // outColor = texture(u_channel0, nuv * 0.5 + 0.5); // If you want to sample another texture
    outColor = vec4((nuv - uv).yxy, 1.0);
}
`;

function AudioVisualizer({ audio }: { audio: ArrayBuffer | null }) {
  const [programInfo, setProgramInfo] = useState<twgl.ProgramInfo | null>(null);
  const [ctx, canvas, setCanvas] = useCanvas({
    contextId: 'webgl2',
    autoResize: true,
    setup(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      setProgramInfo(twgl.createProgramInfo(gl, [vs, fs]));
    },
    resize(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    },
  });

  const [audioContext] = useState<AudioContext | null>(() => {
    if (!('AudioContext' in globalThis)) {
      console.error('AudioContext is not supported in this browser');
      return null;
    }
    return new window.AudioContext();
  });
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(
    null,
  );
  const [dataArray, setDataArray] = useState<Uint8Array<ArrayBuffer>>(
    new Uint8Array(),
  );
  const [bufferLength, setBufferLength] = useState<number>(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioContext || !audio) return;

    const setupAudio = async () => {
      if (audio.detached) {
        // Don't use detached audio
        return;
      }

      // Create analyzer
      const newAnalyser = audioContext.createAnalyser();
      newAnalyser.fftSize = 2048;
      setAnalyser(newAnalyser);

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(audio);
      if (!audioBuffer) {
        console.error('Failed to decode audio data');
        return;
      }

      // Store the decoded audio for later use
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(newAnalyser);
      newAnalyser.connect(audioContext.destination);
      setAudioSource(source);

      setBufferLength(newAnalyser.frequencyBinCount);
      const newDataArray = new Uint8Array(newAnalyser.frequencyBinCount);
      setDataArray(newDataArray);

      source.start(0);
    };

    setupAudio().catch(error => {
      console.error('Error setting up audio:', error);
    });

    return () => {
      if (audioSource) {
        if (audioSource.context.state === 'running') {
          audioSource.stop();
        }
        audioSource.disconnect();
      }
    };
  }, [audioContext, audio, audioSource]);

  useAnimationLoop(() => {
    if (!ctx || !canvas || !programInfo) return;

    if (analyser && dataArray) {
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
    }

    // Draw visualizer
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    ctx.clearColor(0.0, 0.0, 0.0, 1.0);
    ctx.viewport(0, 0, canvas.width, canvas.height);

    // Create a texture from the audio data
    const audioTexture = twgl.createTexture(ctx, {
      src: dataArray,
      width: bufferLength,
      height: 1,
      min: ctx.LINEAR,
      mag: ctx.LINEAR,
      wrap: ctx.CLAMP_TO_EDGE,
      format: ctx.LUMINANCE,
      type: ctx.UNSIGNED_BYTE,
    });

    ctx.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(
      ctx,
      programInfo,
      twgl.createBufferInfoFromArrays(ctx, {
        a_position: {
          numComponents: 2,
          data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
        },
        a_texCoord: {
          numComponents: 2,
          data: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
        },
      }),
    );
    twgl.setUniforms(programInfo, {
      u_time: performance.now() / 1000,
      u_resolution: [canvas.width, canvas.height],
      u_audioData: audioTexture,
    });
    twgl.drawBufferInfo(
      ctx,
      twgl.createBufferInfoFromArrays(ctx, {
        a_position: {
          numComponents: 2,
          data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
        },
        a_texCoord: {
          numComponents: 2,
          data: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
        },
      }),
    );

    // Clean up
    ctx.deleteTexture(audioTexture);
  });

  return (
    <canvas className="fixed inset-0 -z-10 h-full w-full" ref={setCanvas} />
  );
}

export default function AudioVisualizerWrapper() {
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async e => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        setAudioBuffer(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="flex flex-col items-center text-white">
      <h1 className="mb-4 text-2xl font-bold text-white">Audio Visualizer</h1>
      <input
        className="hidden"
        id="audio-upload"
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
      />
      <label
        htmlFor="audio-upload"
        className="mb-4 cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Upload Audio
      </label>
      <AudioVisualizer audio={audioBuffer} />
    </div>
  );
}
