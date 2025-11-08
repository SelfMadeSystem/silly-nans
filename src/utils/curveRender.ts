import { Vector2 } from './vec';

type CurveRenderReturn = {
  curve: (x: number, y: number) => void;
  path: () => void;
  reset: () => void;
};

export function CurveRender(ctx: CanvasRenderingContext2D): CurveRenderReturn {
  const vertices: Vector2[] = [];

  return {
    curve: function (x: number, y: number) {
      vertices.push(new Vector2(x, y));
    },

    path: function () {
      // Fully loops. Requires at least 3 vertices.
      if (vertices.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);

      for (let i = 0; i < vertices.length; i++) {
        const p0 = vertices[(i - 1 + vertices.length) % vertices.length];
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        const p3 = vertices[(i + 2) % vertices.length];
        ctx.bezierCurveTo(
          (-p0.x + 6 * p1.x + p2.x) / 6,
          (-p0.y + 6 * p1.y + p2.y) / 6,
          (p1.x + 6 * p2.x - p3.x) / 6,
          (p1.y + 6 * p2.y - p3.y) / 6,
          p2.x,
          p2.y,
        );
      }
    },

    reset: function () {
      vertices.length = 0;
    },
  };
}
