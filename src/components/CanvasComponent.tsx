import { loopAnimationFrame } from '../utils/abortable';
import { useEffect, useRef, useState } from 'react';

type ReturnType = {
  manualUpdate?: boolean;
  resize?: (width: number, height: number) => void;
  update?: (dt: number, time: number) => void;
  mouseMove?: (e: MouseEvent, x: number, y: number) => void;
  mouseDown?: (e: MouseEvent, x: number, y: number) => void;
  mouseUp?: (e: MouseEvent, x: number, y: number) => void;
  keyDown?: (e: KeyboardEvent) => void;
  keyUp?: (e: KeyboardEvent) => void;
  scroll?: (
    e: Event,
    opts: {
      deltaX: number;
      deltaY: number;
      scrollX: number;
      scrollY: number;
      percentX: number;
      percentY: number;
    },
  ) => void;
};

type CreateProps = {
  props: React.HTMLProps<HTMLCanvasElement>;
  autoResize?: boolean;
  setup: (canvas: HTMLCanvasElement, draw: () => void) => ReturnType | void;
};

export default function createCanvasComponent({
  props,
  autoResize,
  setup,
}: CreateProps): React.FC<React.HTMLProps<HTMLCanvasElement>> {
  return function CanvasComponent(props2: React.HTMLProps<HTMLCanvasElement>) {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const didMount = useRef(false);

    useEffect(() => {
      if (!didMount.current && canvas) {
        const { signal, abort } = new AbortController();
        if (autoResize) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }
        let lastTime = performance.now();
        function draw(t: number) {
          const now = performance.now();
          const dt = now - lastTime;
          lastTime = now;
          if (result?.update) result.update!(dt, t);
        }

        function drawNow() {
          draw(document.timeline.currentTime as number);
        }

        const result = setup(canvas, drawNow);
        didMount.current = true;

        if (!result?.manualUpdate) loopAnimationFrame(draw, { signal });
        else requestAnimationFrame(draw);

        if (result?.mouseMove) {
          window.addEventListener(
            'mousemove',
            (e: MouseEvent) => {
              const rect = canvas.getBoundingClientRect();
              result.mouseMove!(e, e.clientX - rect.left, e.clientY - rect.top);
            },
            { signal },
          );
        }

        if (result?.mouseDown) {
          window.addEventListener(
            'mousedown',
            (e: MouseEvent) => {
              const rect = canvas.getBoundingClientRect();
              result.mouseDown!(e, e.clientX - rect.left, e.clientY - rect.top);
            },
            { signal },
          );
        }

        if (result?.mouseUp) {
          window.addEventListener(
            'mouseup',
            (e: MouseEvent) => {
              const rect = canvas.getBoundingClientRect();
              result.mouseUp!(e, e.clientX - rect.left, e.clientY - rect.top);
            },
            { signal },
          );
        }

        if (result?.keyDown) {
          window.addEventListener(
            'keydown',
            (e: KeyboardEvent) => {
              result.keyDown!(e);
            },
            { signal },
          );
        }

        if (result?.keyUp) {
          window.addEventListener(
            'keyup',
            (e: KeyboardEvent) => {
              result.keyUp!(e);
            },
            { signal },
          );
        }

        if (result?.scroll) {
          window.addEventListener(
            'scroll',
            e => {
              const rect = canvas.getBoundingClientRect();
              let deltaX = 0;
              let deltaY = 0;

              if (e instanceof WheelEvent) {
                deltaX = e.deltaX;
                deltaY = e.deltaY;
              } else if (e instanceof TouchEvent && e.touches.length === 1) {
                const touch = e.touches[0];
                deltaX = touch.clientX - rect.left;
                deltaY = touch.clientY - rect.top;
              }

              const scrollX = window.scrollX;
              const scrollY = window.scrollY;
              const percentX = (scrollX - rect.left) / rect.width;
              const percentY = (scrollY - rect.top) / rect.height;
              result.scroll!(e, {
                deltaX,
                deltaY,
                scrollX,
                scrollY,
                percentX,
                percentY,
              });
            },
            { signal },
          );
        }

        if (autoResize) {
          const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            canvas.width = entry.contentRect.width;
            canvas.height = entry.contentRect.height;
            if (result?.resize) {
              result.resize(entry.contentRect.width, entry.contentRect.height);
            }
          });

          observer.observe(canvas);

          signal.addEventListener('abort', () => {
            observer.disconnect();
          });
        }

        return abort;
      }
    }, [canvas]);

    return <canvas {...props} {...props2} ref={setCanvas} />;
  };
}
