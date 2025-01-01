import type { Vector2 } from './vec';

export interface Animal {
  resolve(mousePos: Vector2, dt: number): void;
  display(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    stroke?: string,
    fill?: string,
  ): void;
  debugDisplay(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void;
}
