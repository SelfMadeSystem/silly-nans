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
  moveStrength: 4,
  accStrength: 0,
  xSpeed: 50,
  ySpeed: 15,
  drawAsDist: false,
};

type Options = typeof defaultOptions;

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

  drawLines(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    for (const [i, j] of this.links) {
      const p1 = this.points[i];
      const p2 = this.points[j];
      if (!p1 || !p2) continue;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
  }

  drawPoints(ctx: CanvasRenderingContext2D, options: Options) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    if (options.drawAsDist && options.mouseGradient !== 'none') {
      const maxDist = this.findMaxDistFromOg();

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
        let color; // ]25, 255]
        if (options.mouseGradient === 'inward') {
          color = 25 + 230 * (1 - dist / maxDist);
        } else {
          color = 25 + 230 * (dist / maxDist);
        }
        ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      for (const p of this.points) {
        if (
          p.x < -1 ||
          p.x > canvasWidth + 1 ||
          p.y < -1 ||
          p.y > canvasHeight + 1
        )
          continue;
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  findMaxDistFromOg() {
    let maxDist = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const ogP = this.ogPoints[i];
      const dist = p.sub2(ogP).length();
      if (dist > maxDist) maxDist = dist;
    }
    return maxDist;
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
      const diff = mousePos
        .to3((options.mouseStrength * options.mouseDistance) / 2)
        .sub(p);
      const dist = diff.length();
      const influence =
        Math.max(0, 1 - dist / options.mouseDistance) *
        (options.mouseRepel ? -1 : 1) *
        options.mouseStrength;
      this.points[i] = p.add(diff.mult(dt * influence));
    }
  }

  accelerate(_dt: number, options: Options) {
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
    const ctx = canvas.getContext('2d')!;

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
        optionsFolder
          .addBinding(options, 'drawAsDist')
          .label = 'drawAsDist (slow)';
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = ctx.fillStyle = 'rgba(255, 255, 255)';
        lattice.physics(Math.min(1 / 30, dt / 1000), mousePos, options);
        lattice.drawPoints(ctx, options);
        // lattice.drawLines(ctx);

        if (options.mouseGradient === 'none' || options.drawAsDist) return;
        const mouseGradient = ctx.createRadialGradient(
          mousePos.x,
          mousePos.y,
          0,
          mousePos.x,
          mousePos.y,
          options.mouseDistance,
        );
        if (options.mouseGradient === 'inward') {
          mouseGradient.addColorStop(0, 'rgba(0,0,0, 0.9)');
          mouseGradient.addColorStop(1, 'rgba(0,0,0, 0.2)');
        } else {
          mouseGradient.addColorStop(0, 'rgba(0,0,0, 0.2)');
          mouseGradient.addColorStop(1, 'rgba(0,0,0, 0.9)');
        }
        ctx.fillStyle = mouseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },

      mouseMove(_e, x, y) {
        mousePos = new Vector2(x, y);
      },

      resize() {
        lattice = newLattice(options);
      },
    };
  },
});
