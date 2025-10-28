import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const TEXT = `\
Proident do ex qui eu ad anim esse irure. Non mollit pariatur exercitation
commodo amet est ex. Eiusmod eu sunt labore ad consequat magna. In ad voluptate
irure tempor eu enim reprehenderit. Incididunt eu laboris id irure id magna.
Deserunt do et ea quis in et. Adipisicing aute labore aliquip id fugiat ullamco
qui velit id officia. Voluptate nostrud cupidatat laborum aute dolor duis quis
minim velit. Nostrud voluptate culpa laboris reprehenderit commodo eu mollit.`;

const defaultOptions = {
  fontSize: 24,
  fontFamily: 'monospace',
  rippleStrength: 10.0,
  rippleDamping: 1.0,
  rippleRadius: 5.0,
  rippleStride: 4.0,
  maxThreshold: 400.0,
  minThreshold: 0.0,
  colorBoost: 0.2,
  colorBoostBlue: 0.5,
  charOffsetX: 0,
  charOffsetY: -4,
};

type WebGLTextOptions = typeof defaultOptions;

function textButRandom() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]{}<>?/|\\`~!@#$%^&*()-_=+';
  let result = '';
  for (let i = 0; i < TEXT.length; i++) {
    const t = TEXT[i];
    if (t.trim() === '') {
      result += t;
    } else {
      const randIndex = Math.floor(Math.random() * chars.length);
      result += chars[randIndex];
    }
  }
  return result;
}

function getFont(options: WebGLTextOptions) {
  return `${options.fontSize}px ${options.fontFamily}`;
}

function getLineHeight(options: WebGLTextOptions) {
  const fontSize = options.fontSize || 16;
  const lineHeight = Math.ceil(fontSize * 1.2);
  return lineHeight;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  options: WebGLTextOptions,
) {
  const lines = text.split('\n');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = getFont(options);
  context.textAlign = 'left';
  // use top baseline so we can control vertical centering precisely
  context.textBaseline = 'top';
  context.fillStyle = 'black';

  const lineHeight = getLineHeight(options);

  const totalHeight = lines.length * lineHeight;
  const startY = canvas.height / 2 - totalHeight / 2;
  const centerX = canvas.width / 2;

  let maxWidth = 0;
  for (const line of lines) {
    const metrics = context.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * lineHeight;
    context.fillText(line, centerX - maxWidth / 2, y);
  }
}

const vertexShader = /* glsl */ `
attribute vec4 position;
attribute vec2 texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = position;
  v_texcoord = texcoord;
}
`;

const textFragShader = /* glsl */ `
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D textTex;
uniform sampler2D randTex;
uniform sampler2D rippleTex;
uniform float time;
uniform vec2 pointerPos;
uniform vec2 resolution;
uniform vec2 charSize;
uniform vec2 charOffset;
uniform float maxThreshold;
uniform float minThreshold;
uniform float colorBoost;
uniform float colorBoostBlue;

vec2 getCharPos(vec2 uv) {
  // Calculate character grid position
  vec2 fragCoord = uv * resolution;
  vec2 charIndex = floor((fragCoord - charOffset) / charSize);
  vec2 charUV = (charIndex * charSize) / resolution;
  return charUV;
}

vec4 getRipple(vec2 uv) {
  vec4 rippleData = texture2D(rippleTex, uv);
  return rippleData;
}

vec4 getAvgRipple(vec2 charCoord) {
  // Average height over the character cell
  vec2 charPixelSize = charSize / resolution;
  vec4 h1 = getRipple(charCoord + vec2(0.0, 0.0) * charPixelSize);
  vec4 h2 = getRipple(charCoord + vec2(1.0, 0.0) * charPixelSize);
  vec4 h3 = getRipple(charCoord + vec2(0.0, 1.0) * charPixelSize);
  vec4 h4 = getRipple(charCoord + vec2(1.0, 1.0) * charPixelSize);
  return (h1 + h2 + h3 + h4) / 4.0;
}

void main() {
  // Draw randTex if close to pointer, else textTex
  vec2 uv = v_texcoord;
  vec2 charCoord = getCharPos(uv);
  vec4 ripple = getAvgRipple(charCoord);
  float dist = 500.0 - (ripple.x * 500.0);
  vec4 textTexel = texture2D(textTex, uv);
  vec4 randTexel = texture2D(randTex, uv);

  // Get the velocity/direction from ripple data
  // rippleTexel.y contains the previous height
  float currentHeight = ripple.x;
  float prevHeight = ripple.y;
  float velocity = currentHeight - prevHeight;

  vec4 color;
  if (dist < maxThreshold) {
    // Create a value that goes 0->1->0 over [minThreshold, maxThreshold]
    float midThreshold = (minThreshold + maxThreshold) / 2.0;
    float mixAmount = 1.0 - abs(dist - midThreshold) / (midThreshold - minThreshold);
    mixAmount = clamp(mixAmount, 0.0, 1.0);
    
    // Only show random characters when the wave is moving in the positive direction (expanding)
    float isExpanding = step(0.0, velocity);
    float randomness = mixAmount * isExpanding;
    
    color = mix(textTexel, randTexel, randomness);

    color.rgb += vec3(colorBoost, colorBoost, colorBoostBlue) * (1.0 - (dist / maxThreshold));
  } else {
    color = textTexel;
  }
  gl_FragColor = color;
}
`;

const rippleFragShader = /* glsl */ `
precision highp float;


varying vec2 v_texcoord;
uniform sampler2D prevTex;
uniform float time;
uniform float dt;
uniform vec2 pointerPos;
uniform bool pointerDown;
uniform vec2 resolution;
uniform float rippleStrength;
uniform float rippleDamping;
uniform float rippleRadius;
uniform float rippleStride;

void main()
{
  vec2 uv = v_texcoord;
  uv.y = 1.0 - uv.y;
  vec2 fragCoord = uv * resolution;
  vec2 stride = vec2(rippleStride) / resolution;
  vec4 hC = texture2D(prevTex, uv);
  vec4 hL = texture2D(prevTex, uv - vec2(stride.x, 0.0));
  vec4 hR = texture2D(prevTex, uv + vec2(stride.x, 0.0));
  vec4 hT = texture2D(prevTex, uv + vec2(0.0, stride.y));
  vec4 hB = texture2D(prevTex, uv - vec2(0.0, stride.y));

  float new_height = (hL.x + hR.x + hT.x + hB.x) / 2.0 - hC.y;
  float dist = distance(fragCoord, pointerPos);

  if (pointerDown) {
    new_height += rippleStrength * exp(-dist/rippleRadius);
  }

  new_height *= rippleDamping;

  gl_FragColor = vec4(new_height, hC.x, hC.y, 1.0);
}
`;

function WebGLText({ options }: { options: WebGLTextOptions }) {
  const charOffsetRef = useRef<Vector2>(
    new Vector2(options.charOffsetX, options.charOffsetY),
  );
  const charSizeRef = useRef<Vector2>(new Vector2(0, 0));
  const textProgramRef = useRef<twgl.ProgramInfo | null>(null);
  const rippleProgramRef = useRef<twgl.ProgramInfo | null>(null);
  const rippleTexRef = useRef<[WebGLTexture, WebGLTexture] | null>(null);
  const rippleFBORef = useRef<
    [twgl.FramebufferInfo, twgl.FramebufferInfo] | null
  >(null);

  const [gl, glCanvas, setCanvas] = useCanvas<'webgl'>({
    contextId: 'webgl',
    autoResize: true,
    setup: (gl, canvas) => {
      // Basic WebGL setup
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      textProgramRef.current = twgl.createProgramInfo(gl, [
        vertexShader,
        textFragShader,
      ]);

      rippleProgramRef.current = twgl.createProgramInfo(gl, [
        vertexShader,
        rippleFragShader,
      ]);
    },

    resize: (gl, canvas) => {
      gl.viewport(0, 0, canvas.width, canvas.height);

      if (!rippleProgramRef.current) {
        return;
      }

      const tex1 = twgl.createTexture(gl, {
        width: canvas.width,
        height: canvas.height,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
      const tex2 = twgl.createTexture(gl, {
        width: canvas.width,
        height: canvas.height,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
      rippleTexRef.current = [tex1, tex2];

      const fbo1 = twgl.createFramebufferInfo(
        gl,
        [{ attachment: tex1 }],
        canvas.width,
        canvas.height,
      );
      const fbo2 = twgl.createFramebufferInfo(
        gl,
        [{ attachment: tex2 }],
        canvas.width,
        canvas.height,
      );
      rippleFBORef.current = [fbo1, fbo2];
    },
  });
  const [textCtx, textCanvas, setTextCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize(context, canvas) {
      // only need to draw to this once
      drawTextLines(context, canvas, TEXT, options);
      // measure character size
      context.font = getFont(options);
      const metrics = context.measureText('M');
      const width = metrics.width;
      const height = getLineHeight(options);
      charSizeRef.current = new Vector2(width, height);
      charOffsetRef.current = new Vector2(
        options.charOffsetX,
        options.charOffsetY,
      );
    },
  });
  const [randCtx, randCanvas, setRandCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
  });

  const pointer = usePointerPosition(glCanvas) || new Vector2(-1000, -1000);
  const prevPointer = useRef<Vector2>(new Vector2(-1000, -1000));

  useAnimationLoop((dt, t) => {
    if (
      !gl ||
      !textCtx ||
      !randCtx ||
      !textCanvas ||
      !randCanvas ||
      !glCanvas ||
      !textProgramRef.current ||
      !rippleProgramRef.current ||
      !rippleTexRef.current
    ) {
      return;
    }

    const textProgramInfo = textProgramRef.current;
    const rippleProgramInfo = rippleProgramRef.current;
    const [rippleTex1, rippleTex2] = rippleTexRef.current;

    // draw random text for the rand canvas (centered, multiline-capable)
    drawTextLines(randCtx, randCanvas, textButRandom(), options);

    // Now draw to WebGL canvas
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const textTex = twgl.createTexture(gl, {
      src: textCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });
    const randTex = twgl.createTexture(gl, {
      src: randCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });

    const arrays = {
      position: {
        numComponents: 2,
        // prettier-ignore
        data: [
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ],
      },
      texcoord: {
        numComponents: 2,
        // prettier-ignore
        data: [
          0, 1,
          1, 1,
          0, 0,
          0, 0,
          1, 1,
          1, 0,
        ],
      },
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    {
      // Ripple pass and swap
      gl.useProgram(rippleProgramInfo.program);
      twgl.setBuffersAndAttributes(gl, rippleProgramInfo, bufferInfo);
      twgl.setUniforms(rippleProgramInfo, {
        prevTex: rippleTex1,
        time: t,
        dt: dt,
        pointerPos: pointer.a,
        pointerDown: pointer.distSq(prevPointer.current) > 1,
        resolution: [glCanvas.width, glCanvas.height],
        rippleStrength: options.rippleStrength,
        rippleDamping: options.rippleDamping,
        rippleRadius: options.rippleRadius,
        rippleStride: options.rippleStride,
      });
      const fbo = rippleFBORef.current!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1].framebuffer);
      twgl.drawBufferInfo(gl, bufferInfo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // swap
      rippleTexRef.current = [rippleTex2, rippleTex1];
      rippleFBORef.current = [fbo[1], fbo[0]];
    }

    gl.useProgram(textProgramInfo.program);
    twgl.setBuffersAndAttributes(gl, textProgramInfo, bufferInfo);
    twgl.setUniforms(textProgramInfo, {
      textTex: textTex,
      randTex: randTex,
      rippleTex: rippleTex1,
      time: t,
      pointerPos: pointer.a,
      resolution: [glCanvas.width, glCanvas.height],
      charSize: charSizeRef.current.a,
      charOffset: charOffsetRef.current.a,
      maxThreshold: options.maxThreshold,
      minThreshold: options.minThreshold,
      colorBoost: options.colorBoost,
      colorBoostBlue: options.colorBoostBlue,
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    // Clean up
    gl.deleteTexture(textTex);
    gl.deleteTexture(randTex);

    prevPointer.current = pointer;
  });

  return (
    <>
      <canvas
        ref={setTextCanvas}
        className="pointer-events-none invisible absolute inset-0 h-full w-full"
      />
      <canvas
        ref={setRandCanvas}
        className="pointer-events-none invisible absolute inset-0 h-full w-full"
      />
      <canvas
        ref={setCanvas}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </>
  );
}

export default function WebGLTextWrapper() {
  const [options] = useState<WebGLTextOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const rippleFolder = pane.addFolder({
        title: 'Ripple Physics',
        expanded: false,
      });
      rippleFolder.addBinding(options, 'rippleStrength', {
        min: 0,
        max: 50,
        step: 0.5,
      });
      rippleFolder.addBinding(options, 'rippleDamping', {
        min: 0.5,
        max: 1.0,
        step: 0.01,
      });
      rippleFolder.addBinding(options, 'rippleRadius', {
        min: 1,
        max: 20,
        step: 0.5,
      });
      rippleFolder.addBinding(options, 'rippleStride', {
        min: 1,
        max: 10,
        step: 0.5,
      });
    }

    {
      const effectFolder = pane.addFolder({
        title: 'Visual Effects',
        expanded: false,
      });
      effectFolder.addBinding(options, 'maxThreshold', {
        min: 100,
        max: 500,
        step: 10,
      });
      effectFolder.addBinding(options, 'minThreshold', {
        min: 0,
        max: 500,
        step: 10,
      });
      effectFolder.addBinding(options, 'colorBoost', {
        min: 0,
        max: 1,
        step: 0.05,
      });
      effectFolder.addBinding(options, 'colorBoostBlue', {
        min: 0,
        max: 1,
        step: 0.05,
      });
    }

    {
      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: true,
      });
      presetsFolder.addButton({ title: 'Default' }).on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Strong Ripple' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          rippleStrength: 3,
          rippleDamping: 1,
          rippleRadius: 7,
          rippleStride: 6.5,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Subtle Wave' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          rippleStrength: 2,
          rippleDamping: 0.99,
          rippleRadius: 15,
          maxThreshold: 300,
        });
        pane.refresh();
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <WebGLText options={options} />;
}
