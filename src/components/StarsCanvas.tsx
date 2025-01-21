import * as twgl from 'twgl.js';
import { ceilMultiple, mod } from '../utils/mathUtils';
import { Vector2, Vector3 } from '../utils/vec';
import createCanvasComponent from './CanvasComponent';
import { Pane } from 'tweakpane';

// Credit to: https://webglfundamentals.org/webgl/lessons/webgl-qna-the-fastest-way-to-draw-many-circles.html
// for the concept behind how to draw thousands of circles in WebGL without a performance hit

const defaultOptions = {
  spacing: 50,
  count: 1000,
  zAmount: 1,
  scrollAmount: 1,
  shiftSpeedX: 0.4,
  shiftAmountX: 30,
  shiftAmountY: 20,
  mouseShiftAmountX: -50,
  mouseShiftAmountY: -70,
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
    public spacing: number,
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

  getDrawPoints(canvas: { width: number; height: number }) {
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
      let alpha = 1;

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

  physics(t: number, scroll: number, mousePos: Vector2, options: Options) {
    this.points = this.ogPoints.map(p => {
      const z = p.z;
      const gz = z * options.zAmount;
      const x =
        p.x +
        mousePos.x * options.mouseShiftAmountX * gz +
        Math.cos(t * options.shiftSpeedX) * gz;
      options.shiftAmountX;
      const y =
        p.y +
        mousePos.y * options.mouseShiftAmountY * gz +
        t * gz * options.shiftAmountY +
        (1 - z) *
          options.zAmount *
          scroll *
          options.scrollAmount *
          0.25 *
          this.height;
      return new Vector3(mod(x, this.width), mod(y, this.height), z);
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

export default createCanvasComponent({
  props: {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
  },
  autoResize: true,
  setup(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const ext = gl.getExtension('ANGLE_instanced_arrays');
    if (!ext) {
      throw new Error('ANGLE_instanced_arrays not supported');
    }
    twgl.addExtensionsToContext(gl);

    const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

    function newStarPlane(options: Options) {
      const offset = ceilMultiple(120, options.spacing);
      return new StarPlane(
        new Vector2(-offset, -offset),
        ceilMultiple(canvas.width, options.spacing) + offset * 2,
        ceilMultiple(canvas.height, options.spacing) + offset * 2,
        options.spacing,
        options.count,
      );
    }

    let starPlane = newStarPlane(defaultOptions);

    const options = { ...defaultOptions };

    let mousePos = new Vector2(-99999, -99999);

    {
      const pane = new Pane({
        title: 'Stars',
        expanded: false,
        container: document.getElementById('tl-pane')!,
      });

      pane
        .addBinding(options, 'count', {
          label: 'Count',
          min: 100,
          max: 2000,
        })
        .on('change', () => {
          starPlane = newStarPlane(options);
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
    }

    return {
      update(dt, t) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const rect = canvas.getBoundingClientRect();
        const scrollY = window.scrollY;
        const percentY = (scrollY - rect.top) / rect.height;

        starPlane.physics(
          t / 1000,
          percentY,
          mousePos.divide(rect.width, rect.height),
          options,
        );
        const drawPoints = starPlane.getDrawPoints(canvas);

        const x = (5 / canvas.width) * 2;
        const y = (5 / canvas.height) * 2;

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

        ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, drawPoints.length);
      },

      mouseMove(_e, x, y) {
        mousePos = new Vector2(x, y);
      },

      resize() {
        starPlane = newStarPlane(options);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      },
    };
  },
});
