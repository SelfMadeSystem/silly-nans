import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { Vector2 } from '../utils/vec';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  particleCount: 10000,
  particleSize: 2,
  mouseDistance: 0.1,
  mouseRepel: 0.1,
  randomWalk: 0.01,
  accel: 0.01,
  maxSpeed: 0.1,
  friction: 1.0,
  color: {
    r: 0.7 * 255,
    g: 0.3 * 255,
    b: 1.0 * 255,
  },
};

type Options = typeof defaultOptions;

const updateVS = /* glsl */ `#version 300 es
in vec2 position;
in vec2 velocity;
in float randomDirection;

out vec2 newPosition;
out vec2 newVelocity;
out float newRandomDirection;

uniform vec2 mousePos;
uniform vec2 resolution;
uniform float mouseDistance;
uniform float mouseRepel;
uniform float randomWalk;
uniform float accel;
uniform float maxSpeed;
uniform float friction;

float newRandom(float prevRandom) {
  float random = fract(sin(prevRandom * 12.9898) * 43758.5453);
  return random;
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
  vec2 direction = normalizedMousePos - normalizedPosition;
  
  // Calculate distance to mouse
  vec2 aspectCorrectedDirection = direction * vec2(resolution.x / resolution.y, 1.0);
  float distance = length(aspectCorrectedDirection);
  float distanceFactor = smoothstep(mouseDistance, mouseDistance * 0.5, distance);

  // Repel from mouse position
  if (distance < mouseDistance) {
    vec2 mouseRepelForce = normalize(direction) * distanceFactor * mouseRepel * 0.002;
    newVelocity = velocity - mouseRepelForce;
  } else {
    newVelocity = rotateVector(sign(randomDirection) * randomWalk, velocity);

    newRandomDirection = randomDirection - sign(randomDirection) * randomWalk;
    if (sign(newRandomDirection) != sign(randomDirection)) {
      newRandomDirection = newRandom(newRandomDirection);
    }
  }
  
  // Limit velocity
  float speed = length(newVelocity);
  if (speed > maxSpeed * 0.01) {
    newVelocity = newVelocity * (maxSpeed * 0.01 / speed);
  } else {
    newVelocity += normalize(newVelocity) * accel * 0.01;
    if (length(newVelocity) > maxSpeed * 0.01) {
      newVelocity = normalize(newVelocity) * maxSpeed * 0.01;
    }
  }

  // Apply friction
  if (length(newVelocity) > 0.000001) {
    newVelocity = mix(newVelocity, vec2(0.0), 1.0 - friction);
  }
  
  // Update position based on velocity
  newPosition = position + newVelocity * resolution;
  
  // Wrap around screen edges
  if (newPosition.x < 0.0) newPosition.x += resolution.x;
  if (newPosition.x > resolution.x) newPosition.x -= resolution.x;
  if (newPosition.y < 0.0) newPosition.y += resolution.y;
  if (newPosition.y > resolution.y) newPosition.y -= resolution.y;

  gl_Position = vec4(0, 0, 0, 1);
}
`;

const renderVS = /* glsl */ `#version 300 es
in vec2 position;
in vec2 velocity;

uniform vec2 resolution;
uniform float particleSize;

void main() {
  // Convert to clip space
  vec2 pos = (position / resolution) * 2.0 - 1.0;
  gl_Position = vec4(pos, 0, 1);

  gl_PointSize = particleSize;
}
`;

const fs = /* glsl */ `#version 300 es
precision highp float;

uniform vec3 color;
out vec4 fragColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  
  // Create a circular particle with smooth edges
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  fragColor = vec4(color, alpha);
}
`;

function TransformFeedbackExample({
  options,
  forceUpdate,
}: {
  options: Options;
  forceUpdate: unknown;
}) {
  const mousePosRef = useRef<Vector2 | null>(null);
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
        transformFeedbackVaryings: [
          'newPosition',
          'newVelocity',
          'newRandomDirection',
        ],
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
      const particleCount = options.particleCount;
      const positions = new Float32Array(particleCount * 2);
      const velocities = new Float32Array(particleCount * 2);
      const randomDirection = new Float32Array(particleCount);

      // Initialize particles with random positions
      for (let i = 0; i < particleCount; i++) {
        positions[i * 2] = Math.random() * canvas.width;
        positions[i * 2 + 1] = Math.random() * canvas.height;
        velocities[i * 2] = (Math.random() - 0.5) * 0.01;
        velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
        randomDirection[i] = Math.random() * 2.0 - 1.0;
      }

      // Create two sets of buffers for ping-pong rendering
      const arrays1 = {
        position: { numComponents: 2, data: positions },
        velocity: { numComponents: 2, data: velocities },
        randomDirection: {
          numComponents: 1,
          data: randomDirection,
        },
      };
      const arrays2 = {
        position: { numComponents: 2, data: positions },
        velocity: { numComponents: 2, data: velocities },
        randomDirection: {
          numComponents: 1,
          data: randomDirection,
        },
      };

      const position1 = twgl.createBufferInfoFromArrays(gl, arrays1);
      const position2 = twgl.createBufferInfoFromArrays(gl, arrays2);
      setBufferInfo({ position1, position2 });
    },
    [options.particleCount],
  );

  useEffect(() => {
    if (gl && canvas) {
      initializeParticles(gl, canvas);
    }
  }, [gl, canvas, initializeParticles, options.particleCount]);

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

    // Update positions using transform feedback
    gl.useProgram(transformFeedback.program);
    twgl.setBuffersAndAttributes(gl, transformFeedback, sourceBuffer);
    twgl.setUniforms(transformFeedback, {
      mousePos: [mousePosition.x, mousePosition.y],
      resolution: [canvas.width, canvas.height],
      mouseDistance: options.mouseDistance,
      mouseRepel: options.mouseRepel,
      randomWalk: options.randomWalk,
      maxSpeed: options.maxSpeed,
      accel: options.accel,
      friction: options.friction,
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
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      2,
      destBuffer.attribs!.randomDirection.buffer,
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
      color: [
        options.color.r / 255,
        options.color.g / 255,
        options.color.b / 255,
      ],
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
  };

  const handleTouchMove = (e: TouchEvent) => {
    disableMouseEvents.current = true;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const newMousePos = new Vector2(x - rect.left, y - rect.top);
    mousePosRef.current = newMousePos;
  };

  useWindowEvent('mousemove', handleMouseMove);
  useWindowEvent('touchstart', handleTouchMove);
  useWindowEvent('touchmove', handleTouchMove);
  useWindowEvent('touchend', () => {
    mousePosRef.current = null;
  });

  return (
    <canvas
      ref={setCanvas}
      className="absolute top-0 left-0 -z-10 h-full w-full"
    />
  );
}

export default function TransformFeedbackWrapper() {
  const [options, setOptions] = useState<Options>({
    ...defaultOptions,
    color: { ...defaultOptions.color },
  });
  const [forceUpdate, setForceUpdate] = useState({});
  const paneRef = useRef<Pane | null>(null);

  useEffect(() => {
    const pane = new Pane();
    paneRef.current = pane;

    const folder = pane.addFolder({
      title: 'Options',
      expanded: true,
    });

    folder
      .addBinding(options, 'particleCount', {
        min: 1000,
        max: 1000000,
        step: 1000,
        label: 'Particle Count',
      })
      .on('change', () => setForceUpdate({}));
    folder.addBinding(options, 'particleSize', {
      min: 1,
      max: 10,
      step: 0.1,
      label: 'Particle Size',
    });
    folder.addBinding(options, 'mouseDistance', {
      min: 0,
      max: 3,
      step: 0.01,
      label: 'Mouse Distance',
    });
    folder.addBinding(options, 'mouseRepel', {
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Mouse Repel',
    });
    folder.addBinding(options, 'randomWalk', {
      min: 0,
      max: 0.1,
      step: 0.001,
      label: 'Random Walk',
    });
    folder.addBinding(options, 'maxSpeed', {
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Max Speed',
    });
    folder.addBinding(options, 'accel', {
      min: 0,
      max: 0.1,
      step: 0.001,
      label: 'Acceleration',
    });
    folder.addBinding(options, 'friction', {
      min: 0.8,
      max: 1,
      step: 0.01,
      label: 'Friction',
    });
    folder.addBinding(options, 'color', {
      label: 'Color',
      view: 'color',
      target: {
        r: 'r',
        g: 'g',
        b: 'b',
      },
    });
    folder
      .addButton({
        title: 'Reset',
      })
      .on('click', () => {
        setOptions({ ...defaultOptions, color: { ...defaultOptions.color } });
      });

    folder
      .addButton({
        title: 'Put ur cursor in the corners',
      })
      .on('click', () => {
        options.particleCount = 500000;
        options.particleSize = 1.0;
        options.mouseDistance = 999.0;
        options.mouseRepel = 1.0;
        options.randomWalk = 0.0;
        options.maxSpeed = 1.0;
        options.accel = 0.0;
        options.friction = 1.0;

        setOptions({ ...options });
        setForceUpdate({});
        pane.refresh();
      });

    folder
      .addButton({
        title: 'Crazy patterns',
      })
      .on('click', () => {
        options.particleCount = 500000;
        options.particleSize = 1.0;
        options.mouseDistance = 999.0;
        options.mouseRepel = 0.05;
        options.randomWalk = 0.0;
        options.maxSpeed = 1.0;
        options.accel = 0.0;
        options.friction = 1.0;

        setOptions({ ...options });
        setForceUpdate({});
        pane.refresh();
      });

    return () => {
      folder.dispose();
    };
  }, [options]);

  return (
    <TransformFeedbackExample options={options} forceUpdate={forceUpdate} />
  );
}
