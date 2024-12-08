import { type MutableRefObject, useEffect, useRef } from 'react';

export type HexThingOptions = {
  len: number;
  count: number;
  baseTime: number;
  addedTime: number;
  dieChance: number;
  spawnChance: number;
  sparkChance: number;
  sparkDist: number;
  sparkSize: number;
  color: string;
  baseLight: number;
  addedLight: number;
  shadowToTimePropMult: number;
  baseLightInputMultiplier: number;
  addedLightInputMultiplier: number;
  cx: number;
  cy: number;
  hueChange: number;
  initialHue: number;
  dieX: number;
  dieY: number;
  changeDirInsteadOfDie: boolean;
};

export const defaultOpts: HexThingOptions = {
  len: 25,
  count: 50,
  baseTime: 10,
  addedTime: 10,
  dieChance: 0.05,
  spawnChance: 1,
  sparkChance: 0.025,
  sparkDist: 10,
  sparkSize: 2,
  color: 'hsl(hue,100%,light%)',
  baseLight: 50,
  addedLight: 10,
  shadowToTimePropMult: 6,
  baseLightInputMultiplier: 0.01,
  addedLightInputMultiplier: 0.02,
  cx: 1,
  cy: 0.5,
  hueChange: 0.1,
  initialHue: Math.random() * 360,
  dieX: 0.8,
  dieY: 0.4,
  changeDirInsteadOfDie: false,
};

/**
 * Yoinked from https://codepen.io/towc/pen/mJzOWJ and heavily modified.
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
const useHexThing = (
  initOpts: Partial<HexThingOptions> & {
    inView: MutableRefObject<boolean>;
    offsetY: MutableRefObject<number>;
    offsetX: MutableRefObject<number>;
  },
) => {
  const canvasRef = useRef<OffscreenCanvas | null>(null);
  const animationFrameRef = useRef<number>(0);
  const hi = useRef<boolean>(false);
  const { inView, offsetY, offsetX } = initOpts;

  useEffect(() => {
    if (hi.current) return;
    hi.current = true;

    const canvas = (canvasRef.current = new OffscreenCanvas(1, 1));
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const opts = {
      ...defaultOpts,
      initialHue: Math.random() * 360,
      ...initOpts,
    };

    let tick = 0;
    const lines: Line[] = [];
    const baseRad = (Math.PI * 2) / 6;

    class Line {
      x: number = 0;
      y: number = 0;
      addedX: number = 0;
      addedY: number = 0;
      rad: number = 0;
      lightInputMultiplier: number = 0;
      color: string = '';
      hue: number = 0;
      cumulativeTime: number = 0;
      time: number = 0;
      targetTime: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = 0;
        this.y = 0;
        this.addedX = 0;
        this.addedY = 0;
        this.rad = baseRad;
        this.lightInputMultiplier = opts.baseLightInputMultiplier + opts.addedLightInputMultiplier * Math.random();
        this.hue = tick * opts.hueChange + opts.initialHue;
        this.color = opts.color.replace('hue', this.hue.toString());
        this.cumulativeTime = 0;
        this.beginPhase();
      }

      beginPhase() {
        const w = canvas.width;
        const h = canvas.height;
        this.x += this.addedX;
        this.y += this.addedY;
        this.time = 0;
        this.targetTime = (opts.baseTime + opts.addedTime * Math.random()) | 0;

        if (Math.random() < opts.dieChance) {
          this.reset();
          return;
        }
        if (
          this.x + this.addedX > (opts.dieX * w) / opts.len ||
          this.x + this.addedX < (-opts.dieX * w) / opts.len ||
          this.y + this.addedY > (opts.dieY * h) / opts.len ||
          this.y + this.addedY < (-opts.dieY * h) / opts.len
        ) {
          if (opts.changeDirInsteadOfDie) {
            this.rad = this.rad + Math.PI;
            this.addedX = Math.cos(this.rad);
            this.addedY = Math.sin(this.rad);
          } else {
            this.reset();
          }
        } else {
          this.rad += baseRad * (Math.random() < 0.5 ? 1 : -1);
          this.addedX = Math.cos(this.rad);
          this.addedY = Math.sin(this.rad);
        }
      }

      step(draw = true) {
        const w = canvas.width;
        const h = canvas.height;

        ++this.time;
        ++this.cumulativeTime;

        if (this.time >= this.targetTime) this.beginPhase();
        if (!draw) return;

        const prop = this.time / this.targetTime;
        const wave = Math.sin((prop * Math.PI) / 2);
        const x = this.addedX * wave;
        const y = this.addedY * wave;

        const x1 = opts.cx * w + (this.x + x) * opts.len + offsetX.current;
        const y1 = opts.cy * h + (this.y + y) * opts.len + offsetY.current;

        // No need to draw if out of bounds.
        if (x1 < 0 || x1 > w || y1 < 0 || y1 > h) {
          return;
        }

        const shadowBlur = prop * opts.shadowToTimePropMult;
        const light = opts.baseLight + opts.addedLight * Math.sin(this.cumulativeTime * this.lightInputMultiplier);

        ctx.shadowBlur = shadowBlur;
        ctx.fillStyle = ctx.shadowColor = this.color.replace('light', light.toString());
        ctx.fillRect(x1, y1, 2, 2);

        if (Math.random() < opts.sparkChance) {
          ctx.fillRect(
            x1 + Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) - opts.sparkSize / 2,
            y1 + Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) - opts.sparkSize / 2,
            opts.sparkSize,
            opts.sparkSize,
          );
        }
      }
    }

    const loop = () => {
      ++tick;
      const w = canvas.width;
      const h = canvas.height;

      if (!prefersReducedMotion) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
      }
      if (lines.length < opts.count && Math.random() < opts.spawnChance) lines.push(new Line());
      lines.forEach(line => line.step(inView.current));
      if (prefersReducedMotion) return;
      // const imageData = ctx.getImageData(0, 0, w, h);
      // const data = imageData.data;
      // for (let i = 3; i < data.length; i += 4) {
      //   data[i] = Math.floor(data[i] * (1 - opts.repaintAlpha));
      // }
      // ctx.putImageData(imageData, 0, 0);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const start = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (prefersReducedMotion) {
        // Simulate the animation.
        const iters = opts.count * 20;
        for (let i = 0; i < iters; i++) {
          // ctx.globalAlpha = clamp((i - iters + opts.count * 3) / (opts.count * 3), 0, 1);
          loop();
        }
        return;
      }
      loop();
    };

    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
};

export default useHexThing;
