import { clamp, isInView, random, wrapNumber } from '../utils/mathUtils';
import { useEffect, useRef } from 'react';

/**
 * Adapted for React from https://github.com/SelfMadeSystem/Portfolio/blob/main/src/utils/MathUtils.ts
 *
 * I'm not going to fully explain how it works. It's been too long since I originally wrote it.
 *
 * I originally wrote my first version of this code in 2021 in SVG generated with Svelte. I then
 * converted it to canvas with Lit for my portfolio, and then to React for this project.
 *
 * The code is still fairly legible, so I hope that's enough.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
const Wave = ({
  fill = '#000',
  fill2 = undefined,
  stroke = '#000',
  amount = 4,
  numberOfReverse = 2,
  waveHeight = 0.75,
  waveWidth = [4, 10],
  waveWidthInRelationToHeight = true,
  speed = [1 / 2 ** 4, 1 / 2 ** 2],
  opacity = 0.25,
  pointiness = 0.3,
  neonEmpty = false,
  neonClipped = false,
  neonWidth = 4,
  neon = false,
}: {
  fill?: string;
  fill2?: string;
  stroke?: string;
  amount?: number;
  numberOfReverse?: number;
  waveHeight?: number;
  waveWidth?: [number, number];
  waveWidthInRelationToHeight?: boolean;
  speed?: [number, number];
  opacity?: number;
  pointiness?: number;
  neonEmpty?: boolean;
  neonClipped?: boolean;
  neonWidth?: number;
  neon?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);

  const waves = useRef(
    new Array(amount).fill(0).map((_, i) => {
      const width = random(...waveWidth);
      return {
        offset: Math.random() * width,
        speed: random(...speed) * (i < numberOfReverse ? -1 : 1),
        width,
        height: i / (amount - 1) || 0,
      };
    }),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const redraw = () => {
      if (!isInView(canvas)) {
        return;
      }
      const date = Date.now();

      ctx.clearRect(0, 0, width, height);

      ctx.save();

      const paths: Path2D[] = [];
      const inversePaths: Path2D[] = [];

      if (!neon) {
        ctx.fillStyle = fillStyle;
        ctx.globalAlpha = opacity;
      } else {
        ctx.fillStyle = '#242424';
      }

      for (const wave of waves.current) {
        const { width: ww } = wave;
        const w = (waveWidthInRelationToHeight ? height : width) * ww;
        const w1 = w * pointiness;

        const h = height * waveHeight;

        const path = new Path2D();
        const inversePath = new Path2D();

        const heightOffset = wave.height * (height - h);
        let o = wrapNumber((date / 1000) * wave.speed * w, 0, w * 2) - w * 2 - w * wave.offset;

        path.moveTo(o, height);
        path.lineTo(o, height - heightOffset);

        if (neon && neonClipped) {
          inversePath.moveTo(o, 0);
          inversePath.lineTo(o, height - heightOffset);
        }

        const optClamp = neon ? neonWidth * 0.5 : 0;

        while (o < width) {
          const a: [number, number, number, number, number, number] = [
            w1 + o,
            height - heightOffset,
            w - w1 + o,
            height - h - heightOffset,
            w + o,
            clamp(height - h - heightOffset, optClamp, height - optClamp),
          ];

          const b: [number, number, number, number, number, number] = [
            w + w1 + o,
            height - h - heightOffset,
            2 * w - w1 + o,
            height - heightOffset,
            2 * w + o,
            clamp(height - heightOffset, optClamp, height - optClamp),
          ];

          path.bezierCurveTo(...a);
          path.bezierCurveTo(...b);

          if (neonClipped) {
            inversePath.bezierCurveTo(...a);
            inversePath.bezierCurveTo(...b);
          }

          o += w * 2;
        }

        path.lineTo(o, height);

        if (neon && neonClipped) {
          inversePath.lineTo(o, 0);
          inversePaths.push(inversePath);
        }
        if (!neon) {
          ctx.fill(path);
        }

        paths.push(path);
      }

      if (!neon || !neonClipped) {
        paths.forEach(p => ctx.clip(p));

        ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (neon) {
        ctx.save();

        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = neonWidth;

        if (fill2Style && neonClipped) {
          ctx.fillStyle = fill2Style;
          for (let i = 0; i < paths.length; i++) {
            const p = paths[i];
            ctx.fill(p);
          }
          ctx.fillStyle = fillStyle;
        }

        for (let i = 0; i < paths.length; i++) {
          const p = paths[i];
          const ip = inversePaths[i];

          if ((!neonEmpty && !neonClipped) || (neonEmpty && i === paths.length - 1) || (neonClipped && i === 0)) {
            ctx.fillStyle = fillStyle;
            ctx.fill(p);
          }

          ctx.stroke(p);

          if (neonClipped) {
            ctx.clip(ip);
          }
        }

        ctx.restore();
      }
    };

    const isOnScreen = () => {
      const rect = canvas.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
    };

    const animateCanvas = () => {
      if (!isOnScreen()) {
        setTimeout(() => {
          requestAnimationFrame(animateCanvas);
        }, 60);
        return;
      }

      redraw();

      if (prefersReducedMotion) {
        return;
      }
      animationFrameRef.current = requestAnimationFrame(animateCanvas);
    };

    let width = (canvas.width = canvas.clientWidth);
    let height = (canvas.height = canvas.clientHeight);

    const fillStyle = fill;
    const fill2Style = fill2;
    const strokeStyle = stroke;

    const setCanvasSize = () => {
      width = canvas.width = canvas.clientWidth;
      height = canvas.height = canvas.clientHeight;
      redraw();
    };

    setCanvasSize();

    new ResizeObserver(setCanvasSize).observe(canvas);

    animationFrameRef.current = requestAnimationFrame(animateCanvas);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
    // react isn't really made for these kinds of elements. It's used to having
    // to do all the heavy lifting for you. So when you do something like this,
    // you can just give react a break and tell it to not worry about it. You
    // can let it hope and pray that you know what you're doing (lol).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', width: '100%', height: '100%' }} />;
};

export default Wave;
