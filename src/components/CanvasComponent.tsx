import { loopAnimationFrame } from '../utils/abortable';
import { useEffect, useRef, useState } from 'react';

type ReturnType = {
  resize?: (width: number, height: number) => void;
  update?: (dt: number) => void;
  mouseMove?: (e: MouseEvent, x: number, y: number) => void;
  mouseDown?: (e: MouseEvent, x: number, y: number) => void;
  mouseUp?: (e: MouseEvent, x: number, y: number) => void;
  keyDown?: (e: KeyboardEvent) => void;
  keyUp?: (e: KeyboardEvent) => void;
};

type CreateProps = {
  props: React.HTMLProps<HTMLCanvasElement>;
  autoResize?: boolean;
  setup: (canvas: HTMLCanvasElement) => ReturnType | void;
};

export default function createCanvasComponent({
  props,
  autoResize,
  setup,
}: CreateProps): React.FC {
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
        const result = setup(canvas);
        didMount.current = true;

        if (result?.update) {
          let lastTime = performance.now();
          loopAnimationFrame(
            () => {
              const now = performance.now();
              const dt = now - lastTime;
              lastTime = now;
              result.update!(dt);
            },
            { signal },
          );
        }

        if (result?.mouseMove) {
          const mouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            result.mouseMove!(e, e.clientX - rect.left, e.clientY - rect.top);
          };

          window.addEventListener('mousemove', mouseMove, { signal });
        }

        if (result?.mouseDown) {
          const mouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            result.mouseDown!(e, e.clientX - rect.left, e.clientY - rect.top);
          };

          window.addEventListener('mousedown', mouseDown, { signal });
        }

        if (result?.mouseUp) {
          const mouseUp = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            result.mouseUp!(e, e.clientX - rect.left, e.clientY - rect.top);
          };

          window.addEventListener('mouseup', mouseUp, { signal });
        }

        if (result?.keyDown) {
          const keyDown = (e: KeyboardEvent) => {
            result.keyDown!(e);
          };

          window.addEventListener('keydown', keyDown, { signal });
        }

        if (result?.keyUp) {
          const keyUp = (e: KeyboardEvent) => {
            result.keyUp!(e);
          };

          window.addEventListener('keyup', keyUp, { signal });
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
