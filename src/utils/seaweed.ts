import type { Animal } from './animal';
import { Chain } from './chain';
import { CurveRender } from './curveRender';
import { clamp, lerp, mod } from './mathUtils';
import { Vector2 } from './vec';

const start = Date.now();

// Wiggly lil green dude
export class Seaweed implements Animal {
  spine: Chain;
  scale: number;
  original: Vector2[];

  constructor(origin: Vector2, scale: number) {
    this.spine = new Chain(origin, 24, 128 * scale, Math.PI / 8);
    this.scale = scale;
    this.original = this.spine.joints.map(j => j.clone());
  }

  resolve(mousePos: Vector2, _dt: number) {
    const dt = (Date.now() - start) / 1000;
    // this.spine.joints[this.spine.joints.length - 1] = this.anchor;
    this.spine.physics([]);
    this.spine.resetAngles();

    for (let i = 0; i < this.spine.joints.length; i++) {
      const { x, y } = this.spine.joints[i];
      const amnt = Math.sin(y * 0.02 - x * 0.01 + dt * 2) * 3;
      const vec1 = new Vector2(0, 0);

      const og = this.original[i];
      const diff = this.spine.joints[i].sub(og);
      const spring = diff.mult(0.1);

      this.spine.prevJoints[i] = this.spine.prevJoints[i].add(spring).add(vec1);
    }

    // this.spine.resolve(this.spine.joints[0]);
    // apply a bit of velocity to all joints close to the mouse
    // to move away from the mouse the closer they are to the mouse
    for (let i = 0; i < this.spine.joints.length; i++) {
      const j = this.spine.joints[i];

      const dist = j.sub(mousePos).length();

      const d = 512;

      const v = clamp(lerp(5, 0, dist / d), 0, 5);
      this.spine.prevJoints[i] = this.spine.prevJoints[i].add(
        mousePos.sub(j).normalize().mult(v),
      );
    }
  }

  display(ctx: CanvasRenderingContext2D, stroke?: string, fill?: string) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke ?? '#f0f';
    ctx.fillStyle = fill ?? '#f0f';
    const { curve } = CurveRender(ctx);

    // === START BODY ===
    ctx.beginPath();

    ctx.moveTo(...this.getPos(0, Math.PI / 2, 0).a());

    // Right half of the snake
    for (let i = 0; i < this.spine.joints.length; i++) {
      curve(...this.getPos(i, Math.PI / 2, 0).a());
    }

    curve(...this.getPos(-1, Math.PI, 0).a());

    // Left half of the snake
    for (let i = this.spine.joints.length - 1; i >= 0; i--) {
      curve(...this.getPos(i, -Math.PI / 2, 0).a());
    }

    // Top of the head (completes the loop)
    curve(...this.getPos(0, -Math.PI / 6, 0).a());
    curve(...this.getPos(0, 0, 0).a());
    curve(...this.getPos(0, Math.PI / 6, 0).a());

    // Some overlap needed because curve requires extra vertices that are not rendered
    curve(...this.getPos(0, Math.PI / 2, 0).a());
    curve(...this.getPos(1, Math.PI / 2, 0).a());
    curve(...this.getPos(2, Math.PI / 2, 0).a());

    ctx.closePath();
    if (fill !== undefined) ctx.fill();
    if (stroke !== undefined) ctx.stroke();
    // === END BODY ===

    // === START EYES ===
    // ctx.fillStyle = "white";
    // ctx.beginPath();
    // ctx.ellipse(
    //   ...this.getPos(0, Math.PI / 2, -18).a(),
    //   12 * this.scale,
    //   12 * this.scale,
    //   0,
    //   0,
    //   2 * Math.PI
    // );
    // ctx.ellipse(
    //   ...this.getPos(0, -Math.PI / 2, -18).a(),
    //   12 * this.scale,
    //   12 * this.scale,
    //   0,
    //   0,
    //   2 * Math.PI
    // );
    // ctx.fill();
    // === END EYES ===
  }

  debugDisplay(ctx: CanvasRenderingContext2D) {
    this.spine.display(ctx);
  }

  bodyWidth(_i: number): number {
    return 64;
  }

  getPos(i: number, angleOffset: number, lengthOffset: number): Vector2 {
    return this.spine.getPos(
      mod(i, this.spine.joints.length),
      angleOffset,
      (lengthOffset + this.bodyWidth(i)) * this.scale,
    );
  }
}
