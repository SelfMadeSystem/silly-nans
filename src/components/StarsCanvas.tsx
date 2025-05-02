import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { ceilMultiple, clamp, lerp, mod } from '../utils/mathUtils';
import { Vector2, Vector3 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

// Credit to: https://webglfundamentals.org/webgl/lessons/webgl-qna-the-fastest-way-to-draw-many-circles.html
// for the concept behind how to draw thousands of circles in WebGL without a performance hit

const defaultOptions = {
  density: 0.5,
  minSize: 2,
  maxSize: 2,
  zAmount: 1,
  scrollAmount: 1,
  shiftSpeedX: 0.4,
  shiftAmountX: 10,
  shiftAmountY: 5,
  mouseShiftAmountX: -50,
  mouseShiftAmountY: -50,
  touchShiftAmountX: -70,
  touchShiftAmountY: -70,
  minVanishSpeed: 0.05,
  maxVanishSpeed: 0.2,
  vanishOffset: 2,
  vanishScrollSpeed: 1,
  mouseEase: 0.8,
  mobileEase: 0.5,
};

type Options = typeof defaultOptions;

type DrawableDot = {
  x: number;
  y: number;
  z: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
};

class StarPlane {
  public ogPoints: Array<Vector3>;
  public points: Array<Vector3>;

  constructor(
    public origin: Vector2,
    public width: number,
    public height: number,
    count: number,
  ) {
    this.points = [];
    this.ogPoints = [];
    for (let i = 0; i < count; i++) {
      const p = new Vector3(
        Math.random() * width,
        Math.random() * height,
        Math.random(),
      );

      this.ogPoints.push(p);
      this.points.push(p);
    }
  }

  getDrawPoints(
    canvas: { width: number; height: number },
    time: number,
    scroll: number,
    options: Options,
  ): Array<DrawableDot> {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const result: Array<DrawableDot> = [];

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (
        p.x < -5 ||
        p.x > canvasWidth + 5 ||
        p.y < -5 ||
        p.y > canvasHeight + 5
      )
        continue;
      const alpha = clamp(
        Math.sin(
          time *
            lerp(
              options.minVanishSpeed,
              options.maxVanishSpeed,
              i / (this.points.length - 1),
            ) +
            (options.vanishScrollSpeed * p.y) / 100 +
            i,
        ) *
          options.vanishOffset +
          0.5,
        0,
        1,
      );

      let r = 1;
      let g = 1;
      let b = 1;

      result.push({
        x: p.x,
        y: p.y,
        z: p.z * 0.2 + 0.05,
        alpha,
        r,
        g,
        b,
      });
    }

    return result;
  }

  physics(
    t: number,
    scroll: number,
    realScroll: number,
    mousePos: Vector2,
    options: Options,
    isMobile: boolean,
  ) {
    this.points = this.ogPoints.map(p => {
      let z = p.z; // [0, 1]
      const gz = z * options.zAmount;
      const shiftX = isMobile
        ? options.touchShiftAmountX
        : options.mouseShiftAmountX;
      const shiftY = isMobile
        ? options.touchShiftAmountY
        : options.mouseShiftAmountY;
      const x =
        p.x +
        mousePos.x * shiftX * gz +
        Math.cos(t * options.shiftSpeedX) * gz * options.shiftAmountX;
      const y =
        p.y +
        mousePos.y * shiftY * gz +
        t * gz * options.shiftAmountY -
        gz * scroll * options.scrollAmount * 0.25 * this.height +
        realScroll;
      const minSize = Math.min(options.minSize, options.maxSize);
      const maxSize = Math.max(options.minSize, options.maxSize);
      const sizeRatio = minSize / maxSize;
      if (options.minSize > options.maxSize) {
        z = 1 - z;
      }
      return new Vector3(
        mod(x, this.width),
        mod(y, this.height),
        sizeRatio + (1 - sizeRatio) * z,
      );
    });
  }
}

const vs = /* glsl */ `
  attribute vec3 pos;
  attribute vec4 color;
  attribute vec4 position;
  attribute vec2 texcoord;

  varying vec2 v_texcoord;
  varying vec4 v_color;
  varying float v_scale;
  
  void main() {
    gl_Position = position + vec4(pos.x - 0.5, 0.5 - pos.y, 0, 0) * 2.;
        
    v_texcoord = texcoord;
    v_color = color;
    v_scale = pos.z;
  }`;

const fs = /* glsl */ `
  precision mediump float;
  varying vec2 v_texcoord;
  varying vec4 v_color;
  varying float v_scale;
  
  float circle(vec2 st, float radius) {
    vec2 dist = st - vec2(0.5);
    float distSquared = dot(dist, dist) * 4.0;
    return 1.0 - smoothstep(radius - 0.02, radius + 0.02, distSquared);
  }
  
  
  void main() {
    float c = circle(v_texcoord, v_scale);
    gl_FragColor = v_color * c;
  }
  `;

function newStarPlane(options: Options, canvas: HTMLCanvasElement) {
  const margin = 50;
  const offset = ceilMultiple(120, margin);
  const count = Math.floor(
    (canvas.width * canvas.height * options.density) / 1000,
  );
  return new StarPlane(
    new Vector2(-offset, -offset),
    ceilMultiple(canvas.width, margin) + offset * 2,
    ceilMultiple(canvas.height, margin) + offset * 2,
    count,
  );
}

function StarsCanvas({ options }: { options: Options }) {
  const [starPlane, setStarPlane] = useState<StarPlane | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const mousePosRef = useRef(new Vector2(0, 0));
  const [targetMousePos, setTargetMousePos] = useState(new Vector2(0, 0));
  const [programInfo, setProgramInfo] = useState<twgl.ProgramInfo | null>(null);
  const [gl, canvas, setCanvas] = useCanvas({
    autoResize: true,
    contextId: 'webgl2',
    setup(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      setProgramInfo(twgl.createProgramInfo(gl, [vs, fs]));

      setStarPlane(newStarPlane(defaultOptions, canvas));
    },

    resize(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      setStarPlane(newStarPlane(options, canvas));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    },
  });

  useAnimationLoop((dt, t) => {
    if (!gl || !canvas || !programInfo || !starPlane) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const rect = canvas.getBoundingClientRect();
    const scrollY = window.scrollY;
    const percentY = scrollY / rect.height;

    const lerpFactor = Math.pow(
      isMobile ? options.mobileEase : options.mouseEase,
      dt,
    );
    mousePosRef.current = mousePosRef.current.lerp(targetMousePos, lerpFactor);

    starPlane.physics(
      t / 1000,
      percentY,
      -rect.top,
      mousePosRef.current.div(rect.width, rect.height),
      options,
      isMobile,
    );
    const drawPoints = starPlane.getDrawPoints(
      canvas,
      t / 1000,
      percentY,
      options,
    );

    const maxSize = Math.max(options.minSize, options.maxSize);
    const x = (maxSize / canvas.width) * 2;
    const y = (maxSize / canvas.height) * 2;

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: {
        numComponents: 2,
        data: [-x, -y, x, -y, -x, y, -x, y, x, -y, x, y],
      },
      texcoord: {
        numComponents: 2,
        data: [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
      },
      color: {
        numComponents: 4,
        data: drawPoints.map(p => [p.r, p.g, p.b, p.alpha]).flat(),
        divisor: 1,
      },
      pos: {
        numComponents: 3,
        data: drawPoints
          .map(p => [p.x / canvas.width, p.y / canvas.height, p.z])
          .flat(),
        divisor: 1,
      },
    });
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    gl.useProgram(programInfo.program);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, drawPoints.length);
  });

  useEffect(() => {
    if (!canvas) return;
    setStarPlane(newStarPlane(options, canvas));
  }, [canvas, options, options.density]);

  useWindowEvent('mousemove', e => {
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    setTargetMousePos(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
  });
  useWindowEvent('touchstart', e => {
    setIsMobile(true);
  });
  useWindowEvent('touchmove', e => {
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    setTargetMousePos(
      new Vector2(
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top,
      ),
    );
  });

  return (
    <canvas
      ref={setCanvas}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    />
  );
}

export default function StarsCanvasWrapper() {
  const [options] = useState<Options>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane({
      title: 'Stars',
      expanded: false,
      container: document.getElementById('tl-pane')!,
    });

    pane.addBinding(options, 'density', {
      label: 'Density',
      min: 0.1,
      max: 1,
    });
    pane.addBinding(options, 'minSize', {
      label: 'Min Size',
      min: 0,
      max: 10,
    });
    pane.addBinding(options, 'maxSize', {
      label: 'Max Size',
      min: 0.1,
      max: 10,
    });
    pane.addBinding(options, 'zAmount', {
      label: 'Z Amount',
      min: 0.5,
      max: 2,
    });
    pane.addBinding(options, 'scrollAmount', {
      label: 'Scroll Amount',
      min: 0,
      max: 2,
    });
    pane.addBinding(options, 'shiftSpeedX', {
      label: 'Shift Speed X',
      min: 0,
      max: 4,
    });
    pane.addBinding(options, 'shiftAmountX', {
      label: 'Shift Amount X',
      min: 0,
      max: 100,
    });
    pane.addBinding(options, 'shiftAmountY', {
      label: 'Shift Amount Y',
      min: 0,
      max: 500,
    });
    pane.addBinding(options, 'mouseShiftAmountX', {
      label: 'Mouse Shift Amount X',
      min: -100,
      max: 100,
    });
    pane.addBinding(options, 'mouseShiftAmountY', {
      label: 'Mouse Shift Amount Y',
      min: -100,
      max: 100,
    });
    pane.addBinding(options, 'touchShiftAmountX', {
      label: 'Touch Shift Amount X',
      min: -100,
      max: 100,
    });
    pane.addBinding(options, 'touchShiftAmountY', {
      label: 'Touch Shift Amount Y',
      min: -100,
      max: 100,
    });
    pane.addBinding(options, 'minVanishSpeed', {
      label: 'Min Vanish Speed',
      min: 0,
      max: 4,
    });
    pane.addBinding(options, 'maxVanishSpeed', {
      label: 'Max Vanish Speed',
      min: 0,
      max: 4,
    });
    pane.addBinding(options, 'vanishOffset', {
      label: 'Vanish Offset',
      min: 1,
      max: 4,
    });
    pane.addBinding(options, 'vanishScrollSpeed', {
      label: 'Vanish Scroll Speed',
      min: 0,
      max: 2,
    });
    pane.addBinding(options, 'mouseEase', {
      label: 'Mouse Ease',
      min: 0,
      max: 1,
    });
    pane.addBinding(options, 'mobileEase', {
      label: 'Mobile Ease',
      min: 0,
      max: 1,
    });
    pane
      .addButton({
        title: 'Reset',
      })
      .on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <StarsCanvas options={options} />;
}
