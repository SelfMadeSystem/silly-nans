import { useEffectIfFalsey } from '../utils/hooks/hooks';
import { loopAnimationFrame } from '../utils/loopAnimationFrame';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

export type ImageType = string | HTMLImageElement;

export type ShaderSlideshowProps = {
  images: ImageType[];
};

export const initialConfig = {
  duration: 5000,
  transitionDuration: 1000,
  intensity: { x: 0.1, y: 0.1 },
  luminanceIntensity: 1,
  noiseIntensity: 20,
  offsetIn: { x: 0, y: 0 },
  offsetOut: { x: 0, y: 0 },
  zoomIn: { x: 1, y: 1 },
  zoomOut: { x: 1, y: 1 },
  rotationIn: 0,
  rotationOut: 0,
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

// Config
uniform vec2 c_intensity;
uniform float c_luminanceIntensity;
uniform float c_noiseIntensity;
uniform vec2 c_offsetIn;
uniform vec2 c_offsetOut;
uniform vec2 c_zoomIn;
uniform vec2 c_zoomOut;
uniform float c_rotationIn;
uniform float c_rotationOut;

#define PI 3.14159265359

float rand(float n) {return fract(sin(n) * 43758.5453123);}

float rand(vec2 n) { 
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(float p) {
  float fl = floor(p);
  float fc = fract(p);
  return mix(rand(fl), rand(fl + 1.0), fc);
}
  
float noise(vec2 n) {
  const vec2 d = vec2(0.0, 1.0);
  vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
  return mix(
    mix(rand(b), rand(b + d.yx), f.x),
    mix(rand(b + d.xy), rand(b + d.yy), f.x),
    f.y
  );
}

vec2 rotateAround(vec2 pos, vec2 center, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  vec2 translated = pos - center;
  vec2 rotated = vec2(
    translated.x * c - translated.y * s,
    translated.x * s + translated.y * c
  );
  return rotated + center;
}

vec2 transformTexCoord(
  vec2 pos,
  float t,
  float intensity,
  vec2 coffset,
  vec2 czoom,
  float crotation
) {
    vec2 center = u_canvasSize * 0.5;
    vec2 turbulence = vec2(
      noise(vec2(pos.x, pos.y) * c_intensity),
      noise(vec2(pos.x, pos.y + 1000.0) * c_intensity)
    );
    vec2 offset = (turbulence - 0.5) * c_noiseIntensity * intensity;
    vec2 offsetTexCoord = pos + offset + coffset;
    offsetTexCoord = (offsetTexCoord - center) * czoom + center;
    vec2 newPos = mix(pos, offsetTexCoord, t);
    return rotateAround(newPos, center, mix(0.0, crotation, t));
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

vec2 mirrorRepeat(vec2 coord) {
  vec2 mirroredCoord = mod(coord, 2.0);
  if (mirroredCoord.x > 1.0) mirroredCoord.x = 2.0 - mirroredCoord.x;
  if (mirroredCoord.y > 1.0) mirroredCoord.y = 2.0 - mirroredCoord.y;
  return mirroredCoord;
}

void main() {
  float progress = min(u_transitionTime, 1.0);
  float t = easeInOut(progress);

  vec2 texCoord1 = image1Pos(v_texCoord);
  vec2 texCoord2 = image2Pos(v_texCoord);

  vec4 ogColor1 = texture2D(u_texture1, texCoord1);
  vec4 ogColor2 = texture2D(u_texture2, texCoord2);

  float intensity = (luminance(ogColor1) + luminance(ogColor2)) * c_luminanceIntensity
  + max(0.0, 1.0 - c_luminanceIntensity);

  texCoord1 = transformTexCoord(
    texCoord1 * u_canvasSize,
    t,
    intensity,
    c_offsetOut,
    c_zoomOut,
    -c_rotationOut
  ) / u_canvasSize;
  texCoord2 = transformTexCoord(
    texCoord2 * u_canvasSize,
    1.0 - t,
    intensity,
    c_offsetIn,
    c_zoomIn,
    c_rotationIn
  ) / u_canvasSize;

  texCoord1 = mirrorRepeat(texCoord1);
  texCoord2 = mirrorRepeat(texCoord2);

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
  ...props
}: ShaderSlideshowProps & React.HTMLAttributes<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config] = useState(() => ({ ...initialConfig }));
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

  useEffect(() => {
    if (!gl || !program) return;
    // setup tweakpane
    const pane = new Pane();

    //#region Config
    const conf = pane.addFolder({ title: 'Shader Slideshow' });

    conf.addBinding(config, 'duration', {
      label: 'Duration',
      min: 0,
    });
    conf.addBinding(config, 'transitionDuration', {
      label: 'Transition Duration',
      min: 0,
    });
    conf
      .addBinding(config, 'intensity', {
        label: 'Intensity',
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform2fv(gl.getUniformLocation(program, 'c_intensity'), [
          value.x,
          value.y,
        ]);
      });
    conf
      .addBinding(config, 'luminanceIntensity', {
        label: 'Luminance Intensity',
        min: 0,
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform1f(
          gl.getUniformLocation(program, 'c_luminanceIntensity'),
          value,
        );
      });
    conf
      .addBinding(config, 'noiseIntensity', {
        label: 'Noise Intensity',
        min: 0,
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'c_noiseIntensity'), value);
      });
    conf
      .addBinding(config, 'offsetIn', {
        label: 'Offset In',
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform2fv(gl.getUniformLocation(program, 'c_offsetIn'), [
          value.x,
          value.y,
        ]);
      });
    conf
      .addBinding(config, 'offsetOut', {
        label: 'Offset Out',
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform2fv(gl.getUniformLocation(program, 'c_offsetOut'), [
          value.x,
          value.y,
        ]);
      });
    conf
      .addBinding(config, 'zoomIn', {
        label: 'Zoom In',
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform2fv(gl.getUniformLocation(program, 'c_zoomIn'), [
          value.x,
          value.y,
        ]);
      });
    conf
      .addBinding(config, 'zoomOut', {
        label: 'Zoom Out',
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform2fv(gl.getUniformLocation(program, 'c_zoomOut'), [
          value.x,
          value.y,
        ]);
      });
    conf
      .addBinding(config, 'rotationIn', {
        label: 'Rotation In',
        min: -2 * Math.PI,
        max: 2 * Math.PI,
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'c_rotationIn'), value);
      });
    conf
      .addBinding(config, 'rotationOut', {
        label: 'Rotation Out',
        min: -2 * Math.PI,
        max: 2 * Math.PI,
      })
      .on('change', ({ value }) => {
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'c_rotationOut'), value);
      });
    //#endregion

    //#region Presets
    const presets = pane.addFolder({ title: 'Presets', expanded: false });
    presets.addButton({ title: 'Default' }).on('click', () => {
      Object.assign(config, initialConfig);
      pane.refresh();
    });
    presets.addButton({ title: 'Move' }).on('click', () => {
      Object.assign(config, {
        offsetIn: { x: -200, y: 50 },
        offsetOut: { x: 200, y: -50 },
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Move Opposite' }).on('click', () => {
      Object.assign(config, {
        offsetIn: { x: -200, y: 50 },
        offsetOut: { x: -200, y: 50 },
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Zoom' }).on('click', () => {
      Object.assign(config, {
        zoomIn: { x: 0.5, y: 0.5 },
        zoomOut: { x: 2, y: 2 },
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Rotate' }).on('click', () => {
      Object.assign(config, {
        rotationIn: Math.PI / 2,
        rotationOut: Math.PI / 2,
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Vertical Stripes' }).on('click', () => {
      Object.assign(config, {
        intensity: { x: 0.5, y: 0.1 },
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Horizontal Stripes' }).on('click', () => {
      Object.assign(config, {
        intensity: { x: 0.1, y: 0.5 },
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Wobble' }).on('click', () => {
      Object.assign(config, {
        intensity: { x: 0.05, y: 0.05 },
        noiseIntensity: 100,
      });
      pane.refresh();
    });
    presets.addButton({ title: 'Noise' }).on('click', () => {
      Object.assign(config, {
        intensity: { x: 1.0, y: 1.0 },
        noiseIntensity: 100,
      });
      pane.refresh();
    });
    //#endregion
  }, [config, gl, program]);

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
      // Can't repeat textures with non-power-of-two dimensions
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    gl.uniform1i(gl.getUniformLocation(program, 'u_texture1'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture2'), 1);

    setTexture1(texture1);
    setTexture2(texture2);

    // set default config
    gl.useProgram(program);
    gl.uniform2fv(gl.getUniformLocation(program, 'c_intensity'), [
      config.intensity.x,
      config.intensity.y,
    ]);
    gl.uniform1f(
      gl.getUniformLocation(program, 'c_luminanceIntensity'),
      config.luminanceIntensity,
    );
    gl.uniform1f(
      gl.getUniformLocation(program, 'c_noiseIntensity'),
      config.noiseIntensity,
    );
    gl.uniform2fv(gl.getUniformLocation(program, 'c_offsetIn'), [
      config.offsetIn.x,
      config.offsetIn.y,
    ]);
    gl.uniform2fv(gl.getUniformLocation(program, 'c_offsetOut'), [
      config.offsetOut.x,
      config.offsetOut.y,
    ]);
    gl.uniform2fv(gl.getUniformLocation(program, 'c_zoomIn'), [
      config.zoomIn.x,
      config.zoomIn.y,
    ]);
    gl.uniform2fv(gl.getUniformLocation(program, 'c_zoomOut'), [
      config.zoomOut.x,
      config.zoomOut.y,
    ]);
    gl.uniform1f(
      gl.getUniformLocation(program, 'c_rotationIn'),
      config.rotationIn,
    );
    gl.uniform1f(
      gl.getUniformLocation(program, 'c_rotationOut'),
      config.rotationOut,
    );
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
    const { duration, transitionDuration } = config;
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
    config,
    currentImageIndex,
    dontAnimate,
    gl,
    images.length,
    program,
    texture1,
    texture2,
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

    const handleStart = (clientX: number) => {
      startX = clientX;
      downTime = Date.now();
      downImageIndex = currentImageIndex;
    };

    const handleMove = (clientX: number) => {
      if (startX === null) return;
      setDontAnimate(false);
      const dx = clientX - startX;

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

    const handleEnd = (clientX: number) => {
      if (startX === null) return;
      const dx = clientX - startX;
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

    const handlePointerDown = (event: PointerEvent) => {
      handleStart(event.clientX);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleMove(event.clientX);
    };

    const handlePointerUp = (event: PointerEvent) => {
      handleEnd(event.clientX);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        handleStart(event.touches[0].clientX);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchmove', handleTouchMove, {
          passive: true,
        });
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      handleMove(event.touches[0].clientX);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      handleEnd(event.changedTouches[0].clientX);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
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
