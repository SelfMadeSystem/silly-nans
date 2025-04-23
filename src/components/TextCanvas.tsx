import * as twgl from 'twgl.js';
import { approxEquals, ceilMultiple } from '../utils/mathUtils';
import { Vector2, Vector3 } from '../utils/vec';
import createCanvasComponent from './CanvasComponent';
import { Pane } from 'tweakpane';

// Credit to: https://webglfundamentals.org/webgl/lessons/webgl-qna-the-fastest-way-to-draw-many-circles.html
// for the concept behind how to draw thousands of circles in WebGL without a performance hit

const defaultOptions = {
  mouseRepel: 160.0,
  velocityInfluence: 24000.0,
  mouseRepelDistance: 100,
  accel: 20.0,
  velocityDamp: 0.99,
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

class PointsManager {
  public points: Array<Vector3>;
  public velocity: Array<Vector3>;
  public ogPoints: Array<Vector3>;

  constructor(
    drawFn: (ctx: CanvasRenderingContext2D) => void,
    width: number,
    height: number,
  ) {
    this.points = [];
    this.velocity = [];
    this.ogPoints = [];
    this.populateFromPath(drawFn, width, height);
  }

  populateFromPath(
    drawFn: (ctx: CanvasRenderingContext2D) => void,
    width: number,
    height: number,
  ) {
    const points = [];

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not supported');
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'red';
    drawFn(ctx);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const alpha = data[i + 3] / 255;

      if (alpha > 0) {
        points.push(new Vector3(x, y, 1));
      }
    }
    const maxPoints = 10000;
    if (points.length > maxPoints) {
      const step = Math.floor(points.length / maxPoints);
      const newPoints = [];
      for (
        let i = Math.floor(Math.random() * step);
        i < points.length;
        i += step
      ) {
        newPoints.push(points[i]);
      }
      points.length = 0;
      points.push(...newPoints);
    }

    this.points = [...points];
    this.ogPoints = [...points];
    this.velocity = points.map(() => new Vector3(0, 0, 0));
  }

  getDrawPoints(
    canvas: {
      width: number;
      height: number;
    },
    options: Options,
  ) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const result: Array<DrawableDot> = [];

    for (let i = 0; i < this.points.length; i++) {
      result.push({
        x: this.points[i].x,
        y: this.points[i].y,
        z: 1,
        alpha: 1,
        r: this.points[i].x / canvasWidth,
        g: this.points[i].y / canvasHeight,
        b: this.points[i].z,
      });
    }

    return result;
  }

  physics(
    dt: number,
    mousePos: Vector2,
    mouseVelocity: Vector2,
    options: Options,
  ) {
    this.accelFromMouse(dt, mousePos, mouseVelocity, options);
    this.accelerate(dt, options);
    this.move(dt, options);
  }

  accelFromMouse(
    dt: number,
    mousePos: Vector2,
    mouseVelocity: Vector2,
    options: Options,
  ) {
    const points = this.points;
    const velo = this.velocity;
    const { mouseRepel, mouseRepelDistance, velocityInfluence } = options;

    // Scale factor for velocity influence
    const velocityMag = mouseVelocity.length();

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const dx = point.x - mousePos.x;
      const dy = point.y - mousePos.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared < mouseRepelDistance * mouseRepelDistance) {
        const dist = Math.sqrt(distSquared);
        const force = Math.min(1, 1 - dist / mouseRepelDistance);

        // Basic repulsion from mouse position
        let forceX = (dx / dist) * force * mouseRepel * dt;
        let forceY = (dy / dist) * force * mouseRepel * dt;

        // Add influence from mouse velocity direction
        if (velocityMag > 1) {
          // Only consider significant movements
          const normVelocity = mouseVelocity.normalize();
          forceX += normVelocity.x * force * velocityInfluence * dt;
          forceY += normVelocity.y * force * velocityInfluence * dt;
        }

        velo[i] = new Vector3(velo[i].x + forceX, velo[i].y + forceY, 0);
      }
    }
  }

  accelerate(dt: number, options: Options) {
    const points = this.points;
    const ogPoints = this.ogPoints;
    const velo = this.velocity;
    const accelFactor = options.accel;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const ogPoint = ogPoints[i];
      const vel = velo[i];

      const dx = point.x - ogPoint.x;
      const dy = point.y - ogPoint.y;
      const distSquared = dx * dx + dy * dy;
      if (distSquared == 0) {
        continue;
      }
      const dist = Math.sqrt(distSquared);
      const force = Math.min(1 - dist, -1);
      const forceX = (dx / dist) * force * accelFactor * dt;
      const forceY = (dy / dist) * force * accelFactor * dt;
      velo[i] = new Vector3(vel.x + forceX, vel.y + forceY, 0);
    }
  }

  move(dt: number, options: Options) {
    const points = this.points;
    const velo = this.velocity;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const vel = velo[i];

      points[i] = point.add(vel.mult(dt));
      velo[i] = vel.mult(options.velocityDamp);
    }
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
    v_scale = 0.2;
  }`;

const fs = /* glsl */ `
  precision mediump float;
  varying vec2 v_texcoord;
  varying vec4 v_color;
  varying float v_scale;
  
  float circle(in vec2 st, in float radius) {
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

    function newLattice(options: Options) {
      const path = new Path2D();
      console.log(canvas.width, canvas.height);
      return new PointsManager(
        ctx => {
          ctx.font = '160px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Hello World', canvas.width / 2, canvas.height / 2);
        },
        canvas.width,
        canvas.height,
      );
    }

    let lattice = newLattice(defaultOptions);

    const options = { ...defaultOptions };

    let mousePos = new Vector2(-99999, -99999);
    let prevMousePos = new Vector2(-99999, -99999);
    let mouseVelocity = new Vector2(0, 0);

    {
      const pane = new Pane();

      {
        const optionsFolder = pane.addFolder({
          title: 'Options',
          expanded: false,
        });

        // Add controls for all available options
        optionsFolder.addBinding(options, 'mouseRepel', {
          min: 0,
          max: 1000,
          step: 1,
          label: 'Mouse Repel',
        });
        optionsFolder.addBinding(options, 'mouseRepelDistance', {
          min: 0,
          max: 1000,
          step: 1,
          label: 'Mouse Repel Distance',
        });
        optionsFolder.addBinding(options, 'velocityInfluence', {
          min: 0,
          max: 100000,
          step: 1,
          label: 'Velocity Influence',
        });
        optionsFolder.addBinding(options, 'accel', {
          min: 0,
          max: 1000,
          step: 1,
          label: 'Acceleration',
        });
        optionsFolder.addBinding(options, 'velocityDamp', {
          min: 0.01,
          max: 0.999,
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
      }

      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });

      // Add several interesting presets
      presetsFolder.addButton({ title: 'Floaty' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 200.0,
          velocityInfluence: 30000.0,
          mouseRepelDistance: 150,
          accel: 10.0,
          velocityDamp: 0.995,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Reactive' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 300.0,
          velocityInfluence: 40000.0,
          mouseRepelDistance: 120,
          accel: 30.0,
          velocityDamp: 0.98,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Sticky' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 100.0,
          velocityInfluence: 10000.0,
          mouseRepelDistance: 80,
          accel: 40.0,
          velocityDamp: 0.97,
        });
        pane.refresh();
      });

      presetsFolder.addButton({ title: 'Chaotic' }).on('click', () => {
        Object.assign(options, {
          mouseRepel: 400.0,
          velocityInfluence: 45000.0,
          mouseRepelDistance: 200,
          accel: 15.0,
          velocityDamp: 0.992,
        });
        pane.refresh();
      });
    }

    return {
      update(dt) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        mouseVelocity = mousePos.sub(prevMousePos).mult(1 / dt);
        prevMousePos = mousePos.clone();

        lattice.physics(
          Math.min(1 / 30, dt / 1000),
          mousePos,
          mouseVelocity,
          options,
        );
        const drawPoints = lattice.getDrawPoints(canvas, options);

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
        lattice = newLattice(options);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      },
    };
  },
});
