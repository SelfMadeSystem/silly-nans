import * as twgl from 'twgl.js';
import { approxEquals, ceilMultiple } from '../utils/mathUtils';
import { Vector2, Vector3 } from '../utils/vec';
import createCanvasComponent from './CanvasComponent';
import { Pane } from 'tweakpane';

const defaultOptions = {
  mouseGradient: 'outward' as 'inward' | 'outward' | 'none',
  spacing: 30,
  mouseRepel: true,
  mouseDistance: 600,
  mouseStrength: 1,
  mouseZ: 50,
  moveStrength: 4,
  accStrength: 0,
  xSpeed: 50,
  ySpeed: 15,
  drawColored: false,
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

class Lattice {
  public ogPoints: Array<Vector2>;
  public points: Array<Vector3>;
  public prevPoints: Array<Vector3>;
  public offset: Vector2 = new Vector2(0, 0);
  public links: Array<[number, number]>;

  constructor(
    public origin: Vector2,
    public width: number,
    public height: number,
    public spacing: number,
  ) {
    this.points = [];
    this.ogPoints = [];
    this.prevPoints = [];
    this.links = [];
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        this.ogPoints.push(origin.add(new Vector2(x, y)));
        this.points.push(new Vector3(x, y, 0).add2(origin));
        this.prevPoints.push(new Vector3(x, y, 0).add2(origin));
      }
    }
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const i = x / spacing + (y / spacing) * Math.ceil(width / spacing);
        if (x + spacing < width) {
          this.links.push([i, i + 1]);
        }
        if (y + spacing < height) {
          this.links.push([i, i + Math.ceil(width / spacing)]);
        }
      }
    }
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
    const [maxDist, maxDistZ] = this.findMaxDistFromOg();

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (
        p.x < -1 ||
        p.x > canvasWidth + 1 ||
        p.y < -1 ||
        p.y > canvasHeight + 1
      )
        continue;
      const ogP = this.ogPoints[i];
      const dist = p.sub2(ogP).length();
      let alpha = 1; // ]0, 1]
      const min = 0.1;
      const imin = 1 - min;
      if (!options.drawColored) {
        switch (options.mouseGradient) {
          case 'inward':
            alpha = min + imin * (1 - dist / maxDist);
            break;
          case 'outward':
            alpha = min + imin * (dist / maxDist);
            break;
          case 'none':
            alpha = 1;
            break;
        }
      }

      let r = 1;
      let g = 1;
      let b = 1;

      if (options.drawColored) {
        const diff = p
          .sub2(ogP)
          .mult(imin / maxDist)
          .abs();
        r = diff.x + min;
        g = diff.y + min;
        b = diff.z + min;
      }

      result.push({
        x: p.x,
        y: p.y,
        z: Math.abs(p.z) / maxDistZ,
        alpha,
        r,
        g,
        b,
      });
    }

    return result;
  }

  findMaxDistFromOg(): [number, number] {
    let maxDist = 0;
    let maxDistZ = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const ogP = this.ogPoints[i];
      const dist = p.sub2(ogP).length();
      if (dist > maxDist) maxDist = dist;
      if (Math.abs(p.z) > maxDistZ) maxDistZ = Math.abs(p.z);
    }
    return [maxDist, maxDistZ];
  }

  physics(dt: number, mousePos: Vector2, options: Options) {
    this.moveOffset(dt, options);
    this.movePointsToOg(dt, options);
    this.moveFromMouse(dt, mousePos, options);
    this.accelerate(dt, options);
    // this.interactPoints(dt);
  }

  moveOffset(dt: number, options: Options) {
    const diff = new Vector2(options.xSpeed, options.ySpeed).mult(dt);
    this.offset = this.offset.add(diff);

    this.points = this.points.map(p => p.add2(diff));
    this.ogPoints = this.ogPoints.map(p => p.add(diff));
    this.prevPoints = this.prevPoints.map(p => p.add2(diff));

    if (this.offset.x > this.spacing) {
      // Get the max x value of the lattice
      const maxX = this.width + this.spacing + this.origin.x;

      // Find the points that are out of bounds
      const outOfBounds = new Set(
        this.ogPoints
          .map((p, i) => (p.x > maxX ? i : -1))
          .filter(i => i !== -1),
      );

      // Move the out of bounds points to the other side
      for (const i of outOfBounds) {
        this.ogPoints[i] = this.ogPoints[i].sub(new Vector2(this.width, 0));
        this.points[i] = this.points[i].sub2(new Vector2(this.width, 0));
        this.prevPoints[i] = this.prevPoints[i].sub2(
          new Vector2(this.width, 0),
        );
      }

      // Reconnect the links
      this.links = this.links.map(([i, j]) => {
        const pi = this.ogPoints[i];
        const pj = this.ogPoints[j];
        if (!pi || !pj || pi.y !== pj.y) return [i, j];

        if (outOfBounds.has(i)) {
          j = this.ogPoints.findIndex(
            p =>
              approxEquals(p.y, pi.y) && approxEquals(p.x, pi.x + this.spacing),
          );
        }
        if (outOfBounds.has(j)) {
          i = this.ogPoints.findIndex(
            p =>
              approxEquals(p.y, pj.y) && approxEquals(p.x, pj.x + this.spacing),
          );
        }
        return [i, j];
      });
    } else if (this.offset.x < 0) {
      const minX = this.origin.x - this.spacing;
      const outOfBounds = new Set(
        this.ogPoints
          .map((p, i) => (p.x < minX ? i : -1))
          .filter(i => i !== -1),
      );
      for (const i of outOfBounds) {
        this.ogPoints[i] = this.ogPoints[i].add(new Vector2(this.width, 0));
        this.points[i] = this.points[i].add2(new Vector2(this.width, 0));
        this.prevPoints[i] = this.prevPoints[i].add2(
          new Vector2(this.width, 0),
        );
      }

      this.links = this.links.map(([i, j]) => {
        const pi = this.ogPoints[i];
        const pj = this.ogPoints[j];
        if (!pi || !pj || pi.y !== pj.y) return [i, j];

        if (outOfBounds.has(i)) {
          j = this.ogPoints.findIndex(
            p =>
              approxEquals(p.y, pi.y) && approxEquals(p.x, pi.x - this.spacing),
          );
        }
        if (outOfBounds.has(j)) {
          i = this.ogPoints.findIndex(
            p =>
              approxEquals(p.y, pj.y) && approxEquals(p.x, pj.x - this.spacing),
          );
        }
        return [i, j];
      });
    }

    if (this.offset.y > this.spacing) {
      const maxY = this.height + this.spacing + this.origin.y;
      const outOfBounds = new Set(
        this.ogPoints
          .map((p, i) => (p.y > maxY ? i : -1))
          .filter(i => i !== -1),
      );
      for (const i of outOfBounds) {
        this.ogPoints[i] = this.ogPoints[i].sub(new Vector2(0, this.height));
        this.points[i] = this.points[i].sub2(new Vector2(0, this.height));
        this.prevPoints[i] = this.prevPoints[i].sub2(
          new Vector2(0, this.height),
        );
      }

      this.links = this.links.map(([i, j]) => {
        const pi = this.ogPoints[i];
        const pj = this.ogPoints[j];
        if (!pi || !pj || pi.x !== pj.x) return [i, j];

        if (outOfBounds.has(i)) {
          j = this.ogPoints.findIndex(
            p =>
              approxEquals(p.x, pi.x) && approxEquals(p.y, pi.y + this.spacing),
          );
        }
        if (outOfBounds.has(j)) {
          i = this.ogPoints.findIndex(
            p =>
              approxEquals(p.x, pj.x) && approxEquals(p.y, pj.y + this.spacing),
          );
        }
        return [i, j];
      });
    } else if (this.offset.y < 0) {
      const minY = this.origin.y - this.spacing;
      const outOfBounds = new Set(
        this.ogPoints
          .map((p, i) => (p.y < minY ? i : -1))
          .filter(i => i !== -1),
      );
      for (const i of outOfBounds) {
        this.ogPoints[i] = this.ogPoints[i].add(new Vector2(0, this.height));
        this.points[i] = this.points[i].add2(new Vector2(0, this.height));
        this.prevPoints[i] = this.prevPoints[i].add2(
          new Vector2(0, this.height),
        );
      }

      this.links = this.links.map(([i, j]) => {
        const pi = this.ogPoints[i];
        const pj = this.ogPoints[j];
        if (!pi || !pj || pi.x !== pj.x) return [i, j];

        if (outOfBounds.has(i)) {
          j = this.ogPoints.findIndex(
            p =>
              approxEquals(p.x, pi.x) && approxEquals(p.y, pi.y - this.spacing),
          );
        }
        if (outOfBounds.has(j)) {
          i = this.ogPoints.findIndex(
            p =>
              approxEquals(p.x, pj.x) && approxEquals(p.y, pj.y - this.spacing),
          );
        }
        return [i, j];
      });
    }

    this.offset = this.offset.mod(new Vector2(this.spacing, this.spacing));
  }

  movePointsToOg(dt: number, options: Options) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const ogP = this.ogPoints[i];
      const diff = ogP.to3().sub(p);
      this.points[i] = p.add(diff.mult(dt * options.moveStrength));
    }
  }

  moveFromMouse(dt: number, mousePos: Vector2, options: Options) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const diff2 = mousePos.sub(p.xy());
      const dist2 = diff2.length();
      const diff3 = mousePos.to3(dist2 + options.mouseZ).sub(p);
      const dist3 = diff3.length();
      const norm = diff3.normalize();
      const influence =
        options.mouseStrength * Math.max(0, 1 - dist3 / options.mouseDistance);
      if (options.mouseRepel) {
        this.points[i] = p.sub(norm.mult(dt * influence * 1000));
      } else {
        this.points[i] = p.add(
          norm.mult(dt * influence * 1000).mult3(new Vector3(1, 1, -1)),
        );
      }
    }
  }

  accelerate(_dt: number, options: Options) {
    (options.mouseStrength * options.mouseDistance) / 2;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const prevP = this.prevPoints[i];
      const diff = p.sub(prevP);
      this.points[i] = p.add(diff.mult(Math.pow(options.accStrength, 0.05)));
      this.prevPoints[i] = p;
    }
  }

  // interactPoints(dt: number) {
  //   for (const [i, j] of this.links) {
  //     const p1 = this.points[i];
  //     const p2 = this.points[j];
  //     const diff = p2.sub(p1);
  //     const dist = diff.length();
  //     const diffLen = dist - this.spacing;
  //     const move = diff.mult((0.5 * diffLen) / dist);
  //     this.points[i] = p1.add(move);
  //     this.points[j] = p2.sub(move);
  //   }
  // }
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
    v_scale = pos.z * 0.8 + 0.2;
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
      const offset = ceilMultiple(120, options.spacing);
      return new Lattice(
        new Vector2(-offset, -offset),
        ceilMultiple(canvas.width, options.spacing) + offset * 2,
        ceilMultiple(canvas.height, options.spacing) + offset * 2,
        options.spacing,
      );
    }

    let lattice = newLattice(defaultOptions);

    const options = { ...defaultOptions };

    let mousePos = new Vector2(-99999, -99999);

    {
      const pane = new Pane();

      {
        const optionsFolder = pane.addFolder({
          title: 'Options',
          expanded: false,
        });
        optionsFolder.addBinding(options, 'mouseGradient', {
          options: {
            Inward: 'inward',
            Outward: 'outward',
            None: 'none',
          },
        });
        optionsFolder
          .addBinding(options, 'spacing', {
            min: 10,
            max: 100,
            step: 1,
          })
          .on('change', () => {
            lattice = newLattice(options);
          });
        optionsFolder.addBinding(options, 'mouseRepel');
        optionsFolder.addBinding(options, 'mouseDistance', {
          min: 0,
          max: 1000,
        });
        optionsFolder.addBinding(options, 'mouseStrength', {
          min: 0,
          max: 3,
        });
        optionsFolder.addBinding(options, 'mouseZ', {
          min: 0,
          max: 100,
        });
        optionsFolder.addBinding(options, 'moveStrength', {
          min: 0,
          max: 10,
        });
        optionsFolder.addBinding(options, 'xSpeed', {
          min: -100,
          max: 100,
        });
        optionsFolder.addBinding(options, 'ySpeed', {
          min: -100,
          max: 100,
        });
        optionsFolder.addBinding(options, 'accStrength', {
          min: 0,
          max: 1,
        });
        optionsFolder.addBinding(options, 'drawColored');
      }

      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });

      presetsFolder
        .addButton({
          title: 'Outward',
        })
        .on('click', () => {
          Object.assign(options, {
            mouseGradient: 'outward',
            mouseRepel: true,
          });
        });

      presetsFolder
        .addButton({
          title: 'Inward',
        })
        .on('click', () => {
          Object.assign(options, {
            mouseGradient: 'inward',
            mouseRepel: false,
          });
        });

      presetsFolder
        .addButton({
          title: 'Wobbly',
        })
        .on('click', () => {
          Object.assign(options, {
            moveStrength: 2,
            accStrength: 0.5,
          });
        });

      presetsFolder
        .addButton({
          title: 'No Wobbly',
        })
        .on('click', () => {
          Object.assign(options, {
            moveStrength: 4,
            accStrength: 0,
          });
        });
    }

    return {
      update(dt) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        lattice.physics(Math.min(1 / 30, dt / 1000), mousePos, options);
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
