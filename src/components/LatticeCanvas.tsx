import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { approxEquals, ceilMultiple } from '../utils/mathUtils';
import { Vector2, Vector3 } from '../utils/vec';
import { useEffect, useState } from 'react';
import { Pane } from 'tweakpane';

// Credit to: https://webglfundamentals.org/webgl/lessons/webgl-qna-the-fastest-way-to-draw-many-circles.html
// for the concept behind how to draw thousands of circles in WebGL without a performance hit

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
        p.x < -5 ||
        p.x > canvasWidth + 5 ||
        p.y < -5 ||
        p.y > canvasHeight + 5
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

      let z = Math.abs(p.z) / maxDistZ;

      if (options.mouseGradient === 'inward') {
        z = 1 - z;
      } else if (options.mouseGradient === 'none') {
        z = 0;
      }

      result.push({
        x: p.x,
        y: p.y,
        z: z,
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
        // Reset the state of the points so it doesn't go all wibbledy wobbledy
        this.points[i] = this.ogPoints[i].to3();
        this.prevPoints[i] = this.points[i];
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
        this.points[i] = this.ogPoints[i].to3();
        this.prevPoints[i] = this.points[i];
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
        this.points[i] = this.ogPoints[i].to3();
        this.prevPoints[i] = this.points[i];
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
        this.points[i] = this.ogPoints[i].to3();
        this.prevPoints[i] = this.points[i];
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
          norm.mult(dt * influence * 500).mult3(new Vector3(1, 1, -1)),
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

function newLattice(options: Options, canvas: HTMLCanvasElement) {
  const offset = ceilMultiple(120, options.spacing);
  return new Lattice(
    new Vector2(-offset, -offset),
    ceilMultiple(canvas.width, options.spacing) + offset * 2,
    ceilMultiple(canvas.height, options.spacing) + offset * 2,
    options.spacing,
  );
}

function LatticeCanvas({ options }: { options: Options }) {
  const [lattice, setLattice] = useState<Lattice | null>(null);
  const [programInfo, setProgramInfo] = useState<twgl.ProgramInfo | null>(null);
  const [mousePos, setMousePos] = useState<Vector2>(new Vector2(-9999, -9999));
  const [gl, canvas, setCanvas] = useCanvas({
    autoResize: true,
    contextId: 'webgl2',
    setup(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      setProgramInfo(twgl.createProgramInfo(gl, [vs, fs]));

      setLattice(newLattice(defaultOptions, canvas));
    },
    resize(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      setLattice(newLattice(options, canvas));
    },
  });

  useEffect(() => {
    if (!canvas) return;
    setLattice(newLattice(options, canvas));
  }, [canvas, options, options.spacing]);

  useAnimationLoop(dt => {
    if (!lattice || !programInfo || !gl || !canvas) return;
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

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, drawPoints.length);
  });

  useWindowEvent('mousemove', (e: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setMousePos(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
  });

  useWindowEvent('mouseleave', () => {
    setMousePos(new Vector2(-9999, -9999));
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

export default function LatticeCanvasWrapper() {
  const [options] = useState<Options>({
    ...defaultOptions,
  });

  useEffect(() => {
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
      optionsFolder.addBinding(options, 'spacing', {
        min: 10,
        max: 100,
        step: 1,
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

      optionsFolder
        .addButton({
          title: 'Reset to Defaults',
        })
        .on('click', () => {
          Object.assign(options, defaultOptions);
          pane.refresh();
        });
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
        pane.refresh();
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
        pane.refresh();
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
        pane.refresh();
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
        pane.refresh();
      });

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <LatticeCanvas options={options} />;
}
