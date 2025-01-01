import { Vector2 } from './vec';

type CurveRenderReturn = {
    curve: (x: number, y: number) => void;
    reset: () => void;
};

export function CurveRender(ctx: CanvasRenderingContext2D): CurveRenderReturn {
    const vertices: Vector2[] = [];

    return {
        curve: function (x: number, y: number) {
            vertices.push(new Vector2(x, y));
            if (vertices.length > 3) {
                const [p0, p1, p2, p3] = vertices.slice(-4);
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
        },
        reset: function () {
            vertices.length = 0;
        },
    };
}