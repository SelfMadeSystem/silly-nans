import { Vector2 } from '../utils/vec';
import createCanvasComponent from './CanvasComponent';
import { Pane } from 'tweakpane';

const defaultOptions = {
  mouseGradient: 'outward' as 'inward' | 'outward' | 'none',
  spacing: 30,
  mouseRepel: true,
  mouseDistance: 600,
  mouseDistanceOffset: 100,
  mouseStrength: 1,
  moveStrength: 4,
};

type Options = typeof defaultOptions;

class Lattice {
  public ogPoints: Array<Vector2>;
  public points: Array<Vector2>;
  public links: Array<[number, number]>;

  constructor(
    origin: Vector2,
    public width: number,
    public height: number,
    public spacing: number,
  ) {
    this.points = [];
    this.ogPoints = [];
    this.links = [];
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        this.points.push(origin.add(new Vector2(x, y)));
        this.ogPoints.push(origin.add(new Vector2(x, y)));
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

  // drawLines(ctx: CanvasRenderingContext2D) {
  //   ctx.beginPath();
  //   for (const [i, j] of this.links) {
  //     const p1 = this.points[i];
  //     const p2 = this.points[j];
  //     ctx.moveTo(p1.x, p1.y);
  //     ctx.lineTo(p2.x, p2.y);
  //   }
  //   ctx.stroke();
  // }

  drawPoints(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    for (const p of this.points) {
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  physics(dt: number, mousePos: Vector2, options: Options) {
    this.movePoints(dt, options);
    this.moveFromMouse(dt, mousePos, options);
    // this.interactPoints(dt);
  }

  movePoints(dt: number, options: Options) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const ogP = this.ogPoints[i];
      const diff = ogP.sub(p);
      this.points[i] = p.add(diff.mult(dt * options.moveStrength));
    }
  }

  moveFromMouse(dt: number, mousePos: Vector2, options: Options) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const diff = mousePos.sub(p);
      const dist = diff.length();
      const influence =
        Math.max(
          0,
          1 - (dist + options.mouseDistanceOffset) / options.mouseDistance,
        ) * (options.mouseRepel ? -1 : 1);
      this.points[i] = p.add(diff.mult(dt * influence));
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
      return new Lattice(
        new Vector2(-options.spacing * 1.5, -options.spacing * 1.5),
        canvas.width + options.spacing * 3,
        canvas.height + options.spacing * 3,
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
          })
          .on('change', () => {
            lattice = newLattice(options);
          });
        optionsFolder.addBinding(options, 'mouseRepel');
        optionsFolder.addBinding(options, 'mouseDistance', {
          min: 0,
          max: 1000,
        });
        optionsFolder.addBinding(options, 'mouseDistanceOffset', {
          min: 0,
          max: 1000,
        });
        optionsFolder.addBinding(options, 'mouseStrength', {
          min: 0,
          max: 10,
        });
        optionsFolder.addBinding(options, 'moveStrength', {
          min: 0,
          max: 10,
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
    }
    return {
      update(dt) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = ctx.fillStyle = 'rgba(255, 255, 255)';
        lattice.physics(dt / 1000, mousePos, options);
        lattice.drawPoints(ctx);

        if (options.mouseGradient === 'none') return;
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
