import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { Vector2 } from '../utils/vec';
import image from './cat.png';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Pane } from 'tweakpane';

const img = 'Image' in globalThis && new Image();
if (img) img.src = image.src;

const defaultOptions = {
  text: 'Hello World',
  maxPoints: 50000,
  particleSize: 2,
  mouseRepel: 160.0,
  velocityInfluence: 10000.0,
  randomInfluence: 0.4,
  mouseRepelDistance: 0.1,
  accel: 20.0,
  velocityDamp: 0.99,
};

type Options = typeof defaultOptions;

const updateVS = /* glsl */ `#version 300 es
in vec4 color;
in vec2 position;
in vec2 ogPosition;
in vec2 velocity;
in float randomSeed;

out vec2 newPosition;
out vec2 newVelocity;
out vec4 vColor;

uniform vec2 mousePos;
uniform vec2 mouseVelocity;
uniform vec2 resolution;
uniform float mouseRepel;
uniform float velocityInfluence;
uniform float randomInfluence;
uniform float mouseRepelDistance;
uniform float accel;
uniform float velocityDamp;
uniform float dt;

float rand(float seed) {
  return fract(sin(seed * 12.9898) * 43758.5453);
}

vec2 rotateVector(float angle, vec2 vector) {
  if (abs(vector.x) < 0.0001 && abs(vector.y) < 0.0001) {
    return vector;
  }
  float cosAngle = cos(angle);
  float sinAngle = sin(angle);
  return vec2(
    vector.x * cosAngle - vector.y * sinAngle,
    vector.x * sinAngle + vector.y * cosAngle
  );
}
void main() {
  vec2 normalizedMousePos = mousePos / resolution;
  normalizedMousePos.y = 1.0 - normalizedMousePos.y; // Flip Y coordinate
  
  vec2 normalizedPosition = position / resolution;
  vec2 direction = normalizedPosition - normalizedMousePos;
  
  // Calculate distance to mouse
  float distSquared = dot(direction, direction);

  // Initialize new velocity with current velocity
  newVelocity = velocity;

  // 1. accelFromMouse logic
  if (distSquared < mouseRepelDistance * mouseRepelDistance) {
    float dist = sqrt(distSquared);
    float force = min(1.0, 1.0 - dist / mouseRepelDistance);
    
    // Basic repulsion from mouse position
    float randomFactor = 1.0 + randomInfluence * (2.0 * rand(newVelocity.x + newVelocity.y) - 1.0);
    vec2 repelForce = normalize(direction) * force * mouseRepel * dt * randomFactor;
    
    // Add influence from mouse velocity
    float velocityMag = length(mouseVelocity);
    if (velocityMag > 0.01) {
      vec2 normVelocity = mouseVelocity / velocityMag;
      normVelocity.y = -normVelocity.y; // Flip Y coordinate
      vec2 velocityForce = normVelocity * force * velocityInfluence * dt * sqrt(velocityMag) * 
                         (1.0 + randomInfluence * (2.0 * rand(newVelocity.x - newVelocity.y) - 1.0));
      repelForce += velocityForce;
    }
    
    newVelocity += repelForce;
  }
  
  // 2. accelerate logic - spring force toward original position
  vec2 toOriginal = ogPosition - position;
  float distToOrigSquared = dot(toOriginal, toOriginal);
  
  if (distToOrigSquared > 0.0001) {
    float distToOrig = sqrt(distToOrigSquared);
    float springForce = min(1.0 - distToOrig, -1.0);
    vec2 accelForce = normalize(toOriginal) * springForce * accel * dt;
    newVelocity -= accelForce;
  }
  
  // 3. move logic
  newPosition = position + newVelocity * dt;
  newVelocity *= velocityDamp;

  // Set the output color for the fragment shader
  vColor = color;

  gl_Position = vec4(0, 0, 0, 1);
}
`;

const renderVS = /* glsl */ `#version 300 es
in vec2 position;
in vec2 velocity;
in vec4 color;

out vec4 vColor;
uniform vec2 mousePos;
uniform vec2 resolution;
uniform float particleSize;

void main() {
  // Convert to clip space
  vec2 pos = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(pos, 0, 1);
  
  gl_PointSize = particleSize;

  // Set the color
  vColor = color;
}
`;

const fs = /* glsl */ `#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  
  // Create a circular particle with smooth edges
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;

function genParticles(options: Options, width: number, height: number) {
  return populateFromPath(
    options.text === '',
    (ctx, scale) => {
      const { width, height } = ctx.canvas;
      if (options.text) {
        ctx.font = `${160 * scale}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.text, width / 2, height / 2);
      } else if (img) {
        ctx.drawImage(
          img,
          width / 2 - (img.width / 2) * scale,
          height / 2 - (img.height / 2) * scale,
          img.width * scale,
          img.height * scale,
        );
      }
    },
    width,
    height,
    options.maxPoints,
  );
}

function getScale(cat: boolean, maxPoints: number) {
  const c = cat ? 3.84 : 1;
  if (maxPoints < 125000 * c) {
    return 1;
  }
  return Math.floor(maxPoints / (125000 * c));
}

function populateFromPath(
  cat: boolean,
  drawFn: (ctx: CanvasRenderingContext2D, scale: number) => void,
  width: number,
  height: number,
  maxPoints: number,
): [Vector2, [number, number, number]][] {
  try {
    const scale = getScale(cat, maxPoints);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
    const points: [Vector2, [number, number, number]][] = [];

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not supported');
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'red';
    drawFn(ctx, scale);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const x = ((i / 4) % width) / scale;
      let y = Math.floor(i / 4 / width);
      y = height - y; // Flip Y coordinate
      y /= scale;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const alpha = data[i + 3] / 255;

      if (alpha > 0) {
        points.push([new Vector2(x, y), [r, g, b]]);
      }
    }

    if (points.length > maxPoints) {
      // Fisher-Yates shuffle and take first maxPoints elements
      // (random selection without replacement)
      for (let i = points.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
      }
      // Truncate to keep only the first maxPoints elements
      points.length = maxPoints;
    }

    return points;
  } catch (error) {
    toast.error('Likely out of memory. Try reducing the number of points.');
    console.error('Error populating from path:', error);
    return [];
  }
}

function TextCanvas({
  options,
  forceUpdate,
}: {
  options: Options;
  forceUpdate: unknown;
}) {
  const mousePosRef = useRef<Vector2 | null>(null);
  const mouseVelocityRef = useRef<Vector2 | null>(null);
  const prevMousePosRef = useRef<Vector2 | null>(null);
  const [programInfo, setProgramInfo] = useState<{
    transformFeedback: twgl.ProgramInfo;
    render: twgl.ProgramInfo;
  } | null>(null);

  const [bufferInfo, setBufferInfo] = useState<{
    position1: twgl.BufferInfo;
    position2: twgl.BufferInfo;
  } | null>(null);

  const tfRef = useRef<WebGLTransformFeedback | null>(null);
  const currentBufferRef = useRef(0);

  const [gl, canvas, setCanvas] = useCanvas({
    autoResize: true,
    contextId: 'webgl2',
    setup: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      initializeParticles(gl, canvas);

      // Create transform feedback program
      const transformFeedback = twgl.createProgramInfo(gl, [updateVS, fs], {
        transformFeedbackVaryings: ['newPosition', 'newVelocity'],
        transformFeedbackMode: gl.SEPARATE_ATTRIBS,
      });

      // Create render program
      const render = twgl.createProgramInfo(gl, [renderVS, fs]);

      setProgramInfo({ transformFeedback, render });

      // Create transform feedback object
      tfRef.current = gl.createTransformFeedback();
    },

    resize(gl: WebGL2RenderingContext) {
      const {
        canvas: { width, height },
      } = gl;
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    },
  });

  const initializeParticles = useCallback(
    (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => {
      if (!gl || !canvas) return;

      // Initialize buffers for position and velocity
      const particles = genParticles(options, canvas.width, canvas.height);
      const particleCount = particles.length;

      const colors = new Float32Array(particleCount * 4);
      const positions = new Float32Array(particleCount * 2);
      const ogPositions = new Float32Array(particleCount * 2);
      const velocities = new Float32Array(particleCount * 2);
      const randomSeeds = new Float32Array(particleCount);

      // Initialize particles with random positions
      for (let i = 0; i < particleCount; i++) {
        const [pos, color] = particles[i];
        colors.set([color[0], color[1], color[2], 1.0], i * 4);
        positions.set([pos.x, pos.y], i * 2);
        ogPositions.set([pos.x, pos.y], i * 2);
        velocities.set([0, 0], i * 2);
        randomSeeds[i] = Math.random();
      }

      // Create two sets of buffers for ping-pong rendering
      const arrays1 = {
        color: { numComponents: 4, data: colors },
        position: { numComponents: 2, data: positions },
        ogPosition: { numComponents: 2, data: ogPositions },
        velocity: { numComponents: 2, data: velocities },
        randomSeed: { numComponents: 1, data: randomSeeds },
      };
      const arrays2 = {
        color: { numComponents: 4, data: colors },
        position: { numComponents: 2, data: positions },
        ogPosition: { numComponents: 2, data: ogPositions },
        velocity: { numComponents: 2, data: velocities },
        randomSeed: { numComponents: 1, data: randomSeeds },
      };

      const position1 = twgl.createBufferInfoFromArrays(gl, arrays1);
      const position2 = twgl.createBufferInfoFromArrays(gl, arrays2);
      setBufferInfo({ position1, position2 });
    },
    [options],
  );

  useEffect(() => {
    if (gl && canvas) {
      initializeParticles(gl, canvas);
    }
  }, [gl, canvas, initializeParticles, options.maxPoints, options.text]);

  useAnimationLoop(dt => {
    if (!gl || !programInfo || !bufferInfo || !tfRef.current) return;
    const { canvas } = gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const { transformFeedback, render } = programInfo;
    const currentBuffer = currentBufferRef.current;
    const nextBuffer = (currentBuffer + 1) % 2;

    // Choose source and destination buffers based on the current step
    const sourceBuffer =
      currentBuffer === 0 ? bufferInfo.position1 : bufferInfo.position2;
    const destBuffer =
      currentBuffer === 0 ? bufferInfo.position2 : bufferInfo.position1;

    const mousePosition =
      mousePosRef.current || new Vector2(canvas.width / 2, canvas.height / 2);

    let mouseVelocity = mouseVelocityRef.current?.mult(1 / dt) ?? null;
    if (!mouseVelocity && mousePosition && prevMousePosRef.current) {
      mouseVelocity = mousePosition.sub(prevMousePosRef.current).mult(1 / dt);
    }
    prevMousePosRef.current = mousePosition;

    // Update positions using transform feedback
    gl.useProgram(transformFeedback.program);
    twgl.setBuffersAndAttributes(gl, transformFeedback, sourceBuffer);
    twgl.setUniforms(transformFeedback, {
      mousePos: [mousePosition.x, mousePosition.y],
      mouseVelocity: [mouseVelocity?.x ?? 0, mouseVelocity?.y ?? 0],
      resolution: [canvas.width, canvas.height],
      mouseRepelDistance: options.mouseRepelDistance,
      mouseRepel: options.mouseRepel,
      velocityInfluence: options.velocityInfluence,
      randomInfluence: options.randomInfluence,
      accel: options.accel,
      velocityDamp: options.velocityDamp,
      dt: Math.min(dt / 1000, 0.01), // Clamp dt to avoid large time steps
    });

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfRef.current);

    // Bind destination buffers for transform feedback output
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      0,
      destBuffer.attribs!.position.buffer,
    );
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      1,
      destBuffer.attribs!.velocity.buffer,
    );

    gl.beginTransformFeedback(gl.POINTS);
    twgl.drawBufferInfo(gl, sourceBuffer, gl.POINTS);
    gl.endTransformFeedback();

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);

    // Draw particles using the updated positions
    gl.useProgram(render.program);
    twgl.setBuffersAndAttributes(gl, render, destBuffer);
    twgl.setUniforms(render, {
      resolution: [canvas.width, canvas.height],
      particleSize: options.particleSize,
    });

    twgl.drawBufferInfo(gl, destBuffer, gl.POINTS);

    // Swap buffers for the next frame
    currentBufferRef.current = nextBuffer;
  });

  const disableMouseEvents = useRef(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (disableMouseEvents.current) return;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX;
    const y = e.clientY;
    const newMousePos = new Vector2(x - rect.left, y - rect.top);
    mousePosRef.current = newMousePos;
    if (!prevMousePosRef.current) {
      prevMousePosRef.current = newMousePos;
    }
  };

  const prevTouchPosRef = useRef<Vector2 | null>(null);

  const handleTouchMove = (e: TouchEvent) => {
    if (disableMouseEvents.current) return;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const newMousePos = new Vector2(x - rect.left, y - rect.top);
    mousePosRef.current = newMousePos;
    if (!prevMousePosRef.current) {
      prevMousePosRef.current = newMousePos;
    }
  };

  useWindowEvent('mousemove', handleMouseMove);
  useWindowEvent('touchstart', handleTouchMove);
  useWindowEvent('touchmove', handleTouchMove);

  return (
    <canvas
      ref={setCanvas}
      className="absolute top-0 left-0 -z-10 h-full w-full"
    />
  );
}

export default function TextCanvasWrapper() {
  const [options] = useState<Options>({ ...defaultOptions });
  const [forceUpdate, setForceUpdate] = useState({});

  useEffect(() => {
    const pane = new Pane();

    {
      const optionsFolder = pane.addFolder({
        title: 'Options',
        expanded: false,
      });

      optionsFolder
        .addBinding(options, 'text', {
          label: 'Text',
        })
        .on('change', () => setForceUpdate({}));
      const maxPoints = optionsFolder
        .addBinding(options, 'maxPoints', {
          min: 1000,
          max: 500000,
          step: 1,
          label: 'Max Points',
        })
        .on('change', () => setForceUpdate({}));
      optionsFolder.addBinding(options, 'particleSize', {
        min: 0.1,
        max: 10,
        step: 0.1,
        label: 'Particle Size',
      });
      optionsFolder.addBinding(options, 'mouseRepel', {
        min: 0,
        max: 1000,
        step: 1,
        label: 'Mouse Repel',
      });
      optionsFolder.addBinding(options, 'mouseRepelDistance', {
        min: 0,
        max: 0.5,
        step: 0.001,
        label: 'Mouse Repel Distance',
      });
      optionsFolder.addBinding(options, 'velocityInfluence', {
        min: 0,
        max: 30000,
        step: 1,
        label: 'Velocity Influence',
      });
      optionsFolder.addBinding(options, 'randomInfluence', {
        min: 0,
        max: 2,
        step: 0.01,
        label: 'Random Influence',
      });
      optionsFolder.addBinding(options, 'accel', {
        min: 0,
        max: 1000,
        step: 1,
        label: 'Acceleration',
      });
      optionsFolder.addBinding(options, 'velocityDamp', {
        min: 0.01,
        max: 1,
        step: 0.001,
        label: 'Velocity Damp',
      });

      // Add button to reset to defaults
      optionsFolder
        .addButton({ title: 'Reset to Defaults' })
        .on('click', () => {
          Object.assign(options, defaultOptions);
          pane.refresh();
        });

      // Add button to increase max points to 2 million, but warn the user
      const gudPcBtn = optionsFolder
        .addButton({ title: 'I haz gud PC' })
        .on('click', () => {
          if (options.maxPoints < 2000000) {
            toast.warn(
              'Warning: Large amounts of points may freeze your browser, depending on your hardware.',
              {
                position: 'top-right',
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
              },
            );
            (maxPoints as unknown as { max: number }).max = 2000000;
            gudPcBtn.dispose();
            pane.refresh();
          } else {
            toast.info('You already have 2 million points!');
          }
        });
    }
    {
      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });

      // Add several interesting presets
      presetsFolder.addButton({ title: 'Floaty' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 200.0,
          velocityInfluence: 5000.0,
          mouseRepelDistance: 0.1,
          accel: 8.0,
          velocityDamp: 0.995,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Reactive' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 1000.0,
          velocityInfluence: 10000.0,
          mouseRepelDistance: 0.2,
          accel: 30.0,
          velocityDamp: 0.98,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Sticky' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 100.0,
          velocityInfluence: 10000.0,
          mouseRepelDistance: 0.08,
          accel: 40.0,
          velocityDamp: 0.97,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Chaotic' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 400.0,
          velocityInfluence: 30000.0,
          mouseRepelDistance: 0.4,
          accel: 15.0,
          velocityDamp: 0.992,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Cat' }).on('click', () => {
        Object.assign(options, {
          text: '',
          maxPoints: 500000,
        });
        pane.refresh();
        setForceUpdate({});
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return (
    <>
      <ToastContainer />
      <TextCanvas options={options} forceUpdate={forceUpdate} />
    </>
  );
}
