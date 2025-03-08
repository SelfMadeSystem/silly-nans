import { useEffectIfFalsey } from '../utils/hooks';
import { loopAnimationFrame } from '../utils/loopAnimationFrame';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';

export type ImageType = string | HTMLImageElement;

export type ShaderSlideshowProps = {
  images: ImageType[];
  duration?: number;
  transitionDuration?: number;
};

const vertexShaderSource = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = /* glsl */ `
precision mediump float;
uniform sampler2D u_texture1;
uniform vec2 u_texture1Size;
uniform sampler2D u_texture2;
uniform vec2 u_texture2Size;
uniform float u_transitionTime;
uniform vec2 u_canvasSize;
varying vec2 v_texCoord;

float rand(float n){return fract(sin(n) * 43758.5453123);}

float rand(vec2 n) { 
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(float p){
  float fl = floor(p);
  float fc = fract(p);
  return mix(rand(fl), rand(fl + 1.0), fc);
}
  
float noise(vec2 n) {
  const vec2 d = vec2(0.0, 1.0);
  vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
  return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

vec2 transformTexCoord(vec2 pos, float t, float intensity) {
    vec2 turbulence = vec2(
      noise(vec2(pos.x, pos.y) * 0.1),
      noise(vec2(pos.x, pos.y + 1000.0) * 0.1)
    );
    vec2 offset = (turbulence - 0.5) * 20.0 * intensity;
    vec2 offsetTexCoord = pos + offset;
    return mix(pos, offsetTexCoord, t);
}

float easeInOut(float t) {
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

vec2 scaleTexCoord(vec2 texCoord, vec2 canvasSize, vec2 textureSize) {
  float canvasAspect = canvasSize.x / canvasSize.y;
  float textureAspect = textureSize.x / textureSize.y;

  vec2 scale;
  vec2 offset = vec2(0.0);

  if (canvasAspect > textureAspect) {
    scale = vec2(1.0, textureAspect / canvasAspect);
    offset.y = (1.0 - scale.y) * 0.5;
  } else {
    scale = vec2(canvasAspect / textureAspect, 1.0);
    offset.x = (1.0 - scale.x) * 0.5;
  }

  return texCoord * scale + offset;
}

vec2 image1Pos(vec2 texCoord) {
  return scaleTexCoord(texCoord, u_canvasSize, u_texture1Size);
}

vec2 image2Pos(vec2 texCoord) {
  return scaleTexCoord(texCoord, u_canvasSize, u_texture2Size);
}

float luminance(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  float progress = min(u_transitionTime, 1.0);
  float t = easeInOut(progress);

  vec2 texCoord1 = image1Pos(v_texCoord);
  vec2 texCoord2 = image2Pos(v_texCoord);

  vec4 ogColor1 = texture2D(u_texture1, texCoord1);
  vec4 ogColor2 = texture2D(u_texture2, texCoord2);

  float intensity = luminance(ogColor1) + luminance(ogColor2);

  texCoord1 = transformTexCoord(texCoord1 * u_canvasSize, t, intensity) / u_canvasSize;
  texCoord2 = transformTexCoord(texCoord2 * u_canvasSize, 1.0 - t, intensity) / u_canvasSize;

  vec4 color1 = texture2D(u_texture1, texCoord1);
  vec4 color2 = texture2D(u_texture2, texCoord2);

  gl_FragColor = mix(color1, color2, t);
}
`;

function loadImages(sources: ImageType[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    sources.map(source =>
      source instanceof HTMLImageElement
        ? Promise.resolve(source)
        : new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
          }),
    ),
  );
}

type UserInteractionState = {
  transition: number;
  direction: 1 | -1;
  held: boolean;
};

export default function ShaderSlideshow({
  images: sources,
  duration = 5000,
  transitionDuration = 1000,
  ...props
}: ShaderSlideshowProps & React.HTMLAttributes<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [prevImageIndex, setPrevImageIndex] = useState(sources.length - 1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState(new Vector2(0, 0));
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [program, setProgram] = useState<WebGLProgram | null>(null);
  const [texture1, setTexture1] = useState<WebGLTexture | null>(null);
  const [texture2, setTexture2] = useState<WebGLTexture | null>(null);
  const [userState, setUserState] = useState<UserInteractionState | null>(null);
  const [dontAnimate, setDontAnimate] = useState(false);

  //#region Load stuff
  useEffect(() => {
    loadImages(sources).then(setImages);
  }, [sources]);

  useEffectIfFalsey(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('Failed to get WebGL context');
      return;
    }

    setGl(gl);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
      console.error('Failed to create vertex shader');
      return;
    }
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(
        'Failed to compile vertex shader:',
        gl.getShaderInfoLog(vertexShader),
      );
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      console.error('Failed to create fragment shader');
      return;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(
        'Failed to compile fragment shader:',
        gl.getShaderInfoLog(fragmentShader),
      );
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create program');
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Failed to link program:', gl.getProgramInfoLog(program));
      return;
    }

    setProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    const texcoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texcoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    const texture1 = gl.createTexture();
    const texture2 = gl.createTexture();

    for (const texture of [texture1, texture2]) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    gl.uniform1i(gl.getUniformLocation(program, 'u_texture1'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture2'), 1);

    setTexture1(texture1);
    setTexture2(texture2);
  }, [gl]);
  //#endregion

  //#region Update textures
  useEffect(() => {
    if (!gl || !texture1 || !texture2 || !program) return;

    const prevImage = images[prevImageIndex];
    const currentImage = images[currentImageIndex];

    if (!prevImage || !currentImage) return;

    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      prevImage,
    );

    gl.useProgram(program);
    gl.uniform2fv(gl.getUniformLocation(program, 'u_texture1Size'), [
      prevImage.width,
      prevImage.height,
    ]);

    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      currentImage,
    );

    gl.useProgram(program);
    gl.uniform2fv(gl.getUniformLocation(program, 'u_texture2Size'), [
      currentImage.width,
      currentImage.height,
    ]);
  }, [
    gl,
    texture1,
    texture2,
    images,
    prevImageIndex,
    currentImageIndex,
    program,
  ]);
  //#endregion

  //#region Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gl || !program) return;

    const { width, height } = canvas.getBoundingClientRect();
    setCanvasSize(new Vector2(width, height));

    gl.viewport(0, 0, width, height);

    gl.useProgram(program);

    const canvasSizeLocation = gl.getUniformLocation(program, 'u_canvasSize');
    gl.uniform2fv(canvasSizeLocation, [width, height]);
  }, [gl, program]);
  //#endregion

  //#region Transition
  useEffect(() => {
    if (!gl || !program || !texture1 || !texture2) return;
    const controller = new AbortController();
    const { signal } = controller;

    let elapsed = 0;
    let prevTime = -1;

    if (userState) {
      elapsed = userState.transition;
    }

    const render = (time: number) => {
      if (prevTime === -1) {
        prevTime = time;
      }
      const dt = time - prevTime;
      prevTime = time;

      if (!userState?.held) {
        if (elapsed > 1) {
          return false;
        }
        if (elapsed < 0) {
          setDontAnimate(true);
          setPrevImageIndex(currentImageIndex);
          setCurrentImageIndex(
            (currentImageIndex - 1 + images.length) % images.length,
          );
          return false;
        }
        elapsed += (dt / transitionDuration) * (userState?.direction ?? 1);
      }

      const transitionTime = Math.max(Math.min(elapsed, 1), 0);

      gl.useProgram(program);

      const canvasSizeLocation = gl.getUniformLocation(program, 'u_canvasSize');
      gl.uniform2fv(canvasSizeLocation, [canvasSize.x, canvasSize.y]);

      const transitionTimeLocation = gl.getUniformLocation(
        program,
        'u_transitionTime',
      );
      gl.uniform1f(transitionTimeLocation, transitionTime);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture1);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture1'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texture2);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture2'), 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (!dontAnimate) {
      loopAnimationFrame(render, { signal });
    }

    const timeout = setTimeout(() => {
      setPrevImageIndex(currentImageIndex);
      setCurrentImageIndex((currentImageIndex + 1) % images.length);
      setDontAnimate(false);
      setUserState(null);
    }, duration);

    return () => {
      controller.abort();
      clearTimeout(timeout); // setTimeout doesn't support AbortController
    };
  }, [
    canvasSize.x,
    canvasSize.y,
    currentImageIndex,
    dontAnimate,
    duration,
    gl,
    images.length,
    program,
    texture1,
    texture2,
    transitionDuration,
    userState,
  ]);
  //#endregion

  //#region User interaction
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.width;

    let startX: number | null = null;
    let downTime = 0;
    let downImageIndex = 0;

    const handlePointerDown = (event: PointerEvent) => {
      startX = event.clientX;
      downTime = Date.now();
      downImageIndex = currentImageIndex;

      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);
    };

    const handlePointerUp = (event: PointerEvent) => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);

      if (startX === null) return;
      const dx = event.clientX - startX;
      const dt = Date.now() - downTime;
      if (Math.abs(dx) < 50 && dt < 200) {
        return;
      }

      if (dx > 0) {
        setUserState({
          transition: 1 - dx / width,
          direction: -1,
          held: false,
        });
      } else {
        setUserState({
          transition: -dx / width,
          direction: 1,
          held: false,
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (startX === null) return;
      setDontAnimate(false);
      const dx = event.clientX - startX;

      if (dx > 0) {
        setUserState({
          transition: 1 - dx / width,
          direction: -1,
          held: true,
        });
        setPrevImageIndex((downImageIndex + images.length - 1) % images.length);
        setCurrentImageIndex(downImageIndex);
      } else {
        setUserState({
          transition: -dx / width,
          direction: 1,
          held: true,
        });
        setPrevImageIndex(downImageIndex);
        setCurrentImageIndex((downImageIndex + 1) % images.length);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [currentImageIndex, images.length]);
  //#endregion

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      width={canvasSize.x}
      height={canvasSize.y}
      {...props}
    />
  );
}
