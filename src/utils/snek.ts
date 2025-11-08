import type { Animal } from './animal';
import { Chain } from './chain';
import { CurveRender } from './curveRender';
import { mod } from './mathUtils';
import { Vector2, relativeAngleDiff } from './vec';

export class Snake implements Animal {
  spine: Chain;
  scale: number;
  eh: number = Math.random();
  eh2: number = Math.random();
  eh3: number = Math.random();
  anchor: Vector2 = new Vector2(0, 0);

  constructor(origin: Vector2, scale: number) {
    this.spine = new Chain(origin, 12, 128 * scale, Math.PI / 8);
    this.spine.physicsParams = {
      ...this.spine.physicsParams,
      gravity: 0,
    };
    this.scale = scale;
    this.anchor = origin.clone();
  }

  resolve(mousePos: Vector2, mouseMove: Vector2, dt: number) {
    this.spine.moveTowards(mousePos, {
      maxAngleDiff: 0.005 / this.scale,
      speed: 1,
    });
  }

  display(
    ctx: CanvasRenderingContext2D,
    stroke?: string,
    fill?: string,
    eyes?: string,
  ) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke ?? '#f0f';
    ctx.fillStyle = fill ?? '#f0f';
    const { curve, path: draw } = CurveRender(ctx);

    // === START BODY ===
    // Right half of the snake
    for (let i = 0; i < this.spine.joints.length; i++) {
      curve(...this.getPos(i, Math.PI / 2, 0).a);
    }

    curve(...this.getPos(-1, Math.PI, 0).a);

    // Left half of the snake
    for (let i = this.spine.joints.length - 1; i >= 0; i--) {
      curve(...this.getPos(i, -Math.PI / 2, 0).a);
    }

    // Top of the head (completes the loop)
    curve(...this.getPos(0, -Math.PI / 6, 0).a);
    curve(...this.getPos(0, 0, 0).a);
    curve(...this.getPos(0, Math.PI / 6, 0).a);

    draw();
    if (fill !== undefined) ctx.fill();
    if (stroke !== undefined) ctx.stroke();
    // === END BODY ===

    // === START EYES ===
    ctx.fillStyle = eyes ?? '#fff';
    ctx.beginPath();
    ctx.ellipse(
      ...this.getPos(0, Math.PI / 2, -32).a,
      12 * this.scale,
      12 * this.scale,
      0,
      0,
      2 * Math.PI,
    );
    ctx.ellipse(
      ...this.getPos(0, -Math.PI / 2, -32).a,
      12 * this.scale,
      12 * this.scale,
      0,
      0,
      2 * Math.PI,
    );
    ctx.fill();
    // === END EYES ===
  }

  debugDisplay(ctx: CanvasRenderingContext2D) {
    this.spine.display(ctx);
  }

  bodyWidth(i: number): number {
    switch (i) {
      case 0:
        return 76;
      case 1:
        return 80;
      default:
        return 64 - i;
    }
  }

  getPos(i: number, angleOffset: number, lengthOffset: number): Vector2 {
    return this.spine.getPos(
      mod(i, this.spine.joints.length),
      angleOffset,
      (lengthOffset + this.bodyWidth(i)) * this.scale,
    );
  }
}

export const DIFFERENT_RENDERING_METHODS: {
  [key: string]: Partial<
    Snake & {
      setStuff: (this: Snake) => void;
    }
  >;
} = {
  snake: {
    setStuff: function (this: Snake) {
      this.spine.linkSize = 128 * this.scale;
    },
    display: Snake.prototype.display,
    bodyWidth: Snake.prototype.bodyWidth,
  },
  fish: {
    setStuff: function (this: Snake) {
      this.spine.linkSize = 64 * this.scale;
    },
    display: function (
      this: Snake,
      ctx: CanvasRenderingContext2D,
      stroke?: string,
      fill?: string,
      eyes?: string,
    ) {
      stroke = stroke ?? '#036';
      fill = fill ?? '#09f';
      eyes = eyes ?? '#fff';
      ctx.lineWidth = 8 * this.scale;
      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.lineJoin = 'round';

      // Alternate labels for shorter lines of code
      const j = this.spine.joints;
      const a = this.spine.angles;

      // Relative angle differences are used in some hacky computation for the dorsal fin
      const headToMid1 = relativeAngleDiff(a[0], a[6]);
      const headToMid2 = relativeAngleDiff(a[0], a[7]);

      // For the caudal fin, we need to compute the relative angle difference from the head to the tail, but given
      // a joint count of 12 and angle constraint of PI/8, the maximum difference between head and tail is 11PI/8,
      // which is >PI. This complicates the relative angle calculation (flips the sign when curving too tightly).
      // A quick workaround is to compute the angle difference from the head to the middle of the fish, and then
      // from the middle of the fish to the tail.
      const headToTail = headToMid1 + relativeAngleDiff(a[6], a[11]);

      // === START PECTORAL FINS ===
      {
        const center = this.getPos(3, Math.PI / 3, 0);
        const angle = a[2] - Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(
          ...center.a,
          80 * this.scale,
          32 * this.scale,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }

      {
        const center = this.getPos(3, -Math.PI / 3, 0);
        const angle = a[2] + Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(
          ...center.a,
          80 * this.scale,
          32 * this.scale,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
      // === END PECTORAL FINS ===

      // === START VENTRAL FINS ===
      ctx.save();
      ctx.beginPath();
      ctx.translate(...this.getPos(7, Math.PI / 2, 0).a);
      ctx.rotate(a[6] - Math.PI / 4);
      ctx.ellipse(0, 0, 32 * this.scale, 16 * this.scale, 0, 0, Math.PI * 2); // Right
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.translate(...this.getPos(7, -Math.PI / 2, 0).a);
      ctx.rotate(a[6] + Math.PI / 4);
      ctx.ellipse(0, 0, 32 * this.scale, 16 * this.scale, 0, 0, Math.PI * 2); // Left
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
      // === END VENTRAL FINS ===

      const { curve, reset, path } = CurveRender(ctx);
      // === START CAUDAL FINS ===
      // "Bottom" of the fish
      for (let i = 8; i < 12; i++) {
        const tailWidth = 1.5 * headToTail * (i - 8) * (i - 8) * this.scale;
        const x = j[i].x + Math.cos(a[i] - Math.PI / 2) * tailWidth;
        const y = j[i].y + Math.sin(a[i] - Math.PI / 2) * tailWidth;
        curve(x, y);
      }

      // "Top" of the fish
      for (let i = 11; i >= 8; i--) {
        const tailWidth =
          Math.max(-13, Math.min(13, headToTail * 6)) * this.scale;
        const x = j[i].x + Math.cos(a[i] + Math.PI / 2) * tailWidth;
        const y = j[i].y + Math.sin(a[i] + Math.PI / 2) * tailWidth;
        curve(x, y);
      }
      path();
      ctx.fill();
      ctx.stroke();
      reset();
      // === END CAUDAL FINS ===

      ctx.fillStyle = fill;

      // === START BODY ===

      // Right half of the fish
      for (let i = 0; i < 10; i++) {
        const x = this.getPos(i, Math.PI / 2, 0).x;
        const y = this.getPos(i, Math.PI / 2, 0).y;
        curve(x, y);
      }

      // Bottom of the fish
      const bottomX = this.getPos(9, Math.PI, 0).x;
      const bottomY = this.getPos(9, Math.PI, 0).y;
      curve(bottomX, bottomY);

      // Left half of the fish
      for (let i = 9; i >= 0; i--) {
        const x = this.getPos(i, -Math.PI / 2, 0).x;
        const y = this.getPos(i, -Math.PI / 2, 0).y;
        curve(x, y);
      }

      // Top of the head (completes the loop)
      const topX = this.getPos(0, -Math.PI / 6, 0).x;
      const topY = this.getPos(0, -Math.PI / 6, 0).y;
      curve(topX, topY);
      curve(this.getPos(0, 0, 4).x, this.getPos(0, 0, 4).y);
      curve(this.getPos(0, Math.PI / 6, 0).x, this.getPos(0, Math.PI / 6, 0).y);

      path();
      ctx.fill();
      ctx.stroke();
      // === END BODY ===

      ctx.fillStyle = fill;

      // === START DORSAL FIN ===
      ctx.beginPath();
      ctx.moveTo(j[4].x, j[4].y);
      ctx.bezierCurveTo(j[5].x, j[5].y, j[6].x, j[6].y, j[7].x, j[7].y);
      ctx.bezierCurveTo(
        j[6].x + Math.cos(a[6] + Math.PI / 2) * headToMid2 * 16 * this.scale,
        j[6].y + Math.sin(a[6] + Math.PI / 2) * headToMid2 * 16 * this.scale,
        j[5].x + Math.cos(a[5] + Math.PI / 2) * headToMid1 * 16 * this.scale,
        j[5].y + Math.sin(a[5] + Math.PI / 2) * headToMid1 * 16 * this.scale,
        j[4].x,
        j[4].y,
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // === END DORSAL FIN ===

      // === START EYES ===
      ctx.fillStyle = eyes;
      ctx.beginPath();
      ctx.ellipse(
        this.getPos(0, Math.PI / 2, -18).x,
        this.getPos(0, Math.PI / 2, -18).y,
        16 * this.scale,
        16 * this.scale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.ellipse(
        this.getPos(0, -Math.PI / 2, -18).x,
        this.getPos(0, -Math.PI / 2, -18).y,
        16 * this.scale,
        16 * this.scale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // === END EYES ===
    },
    bodyWidth: function (this: Snake, i: number): number {
      const bodyWidth: number[] = [68, 81, 84, 83, 77, 64, 51, 38, 32, 19];
      return bodyWidth[i] ?? 16;
    },
  },
};
