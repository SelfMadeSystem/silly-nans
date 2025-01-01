import { Vector2 } from '../utils/vec';
import createCanvasComponent from './CanvasComponent';

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

  physics(dt: number, mousePos: Vector2) {
    this.movePoints(dt);
    this.moveFromMouse(dt, mousePos);
    // this.interactPoints(dt);
  }

  movePoints(dt: number) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const ogP = this.ogPoints[i];
      const diff = ogP.sub(p);
      this.points[i] = p.add(diff.mult(dt * 4));
    }
  }

  moveFromMouse(dt: number, mousePos: Vector2) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const diff = mousePos.sub(p);
      const dist = diff.length();
      const influence = Math.max(0, 1 - (dist + 100) / 600);
      this.points[i] = p.add(diff.mult(dt * influence));
    }
  }

  interactPoints(dt: number) {
    for (const [i, j] of this.links) {
      const p1 = this.points[i];
      const p2 = this.points[j];
      const diff = p2.sub(p1);
      const dist = diff.length();
      const diffLen = dist - this.spacing;
      const move = diff.mult((0.5 * diffLen) / dist);
      this.points[i] = p1.add(move);
      this.points[j] = p2.sub(move);
    }
  }
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

    const lattice = new Lattice(
      new Vector2(-45, -45),
      canvas.width + 60,
      canvas.height + 60,
      30,
    );

    let mousePos = new Vector2(-99999, -99999);

    return {
      update(dt) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = ctx.fillStyle = 'rgba(255, 255, 255)';
        lattice.physics(dt / 1000, mousePos);
        lattice.drawPoints(ctx);

        const mouseGradient = ctx.createRadialGradient(
          mousePos.x,
          mousePos.y,
          0,
          mousePos.x,
          mousePos.y,
          600,
        );
        mouseGradient.addColorStop(0, 'rgba(0,0,0, 0.9)');
        mouseGradient.addColorStop(1, 'rgba(0,0,0, 0.2)');
        ctx.fillStyle = mouseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },

      mouseMove(_e, x, y) {
        mousePos = new Vector2(x, y);
      },
    };
  },
});
