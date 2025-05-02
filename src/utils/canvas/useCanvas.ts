import { useEffect, useRef } from 'react';

type Contexts = {
  '2d': CanvasRenderingContext2D;
  bitmaprenderer: ImageBitmapRenderingContext;
  webgl: WebGLRenderingContext;
  webgl2: WebGL2RenderingContext;
};

type ContextId = keyof Contexts;

type UseCanvasProps<CID extends ContextId> = {
  contextId?: CID;
  setup?: (
    context: Contexts[CID],
    canvas: HTMLCanvasElement,
  ) => void | (() => void);
} & (
  | {
      width: number;
      height: number;
    }
  | {
      autoResize: true;
      resize?: (context: Contexts[CID], canvas: HTMLCanvasElement) => void;
    }
);

/**
 * Custom hook to create a canvas context.
 */
export function useCanvas(
  canvas: HTMLCanvasElement | null,
  props:
    | {
        width: number;
        height: number;
      }
    | {
        autoResize: true;
      },
): CanvasRenderingContext2D | null;
export function useCanvas<CID extends ContextId>(
  canvas: HTMLCanvasElement | null,
  props: UseCanvasProps<CID>,
): Contexts[CID] | null;
export function useCanvas<CID extends ContextId>(
  canvas: HTMLCanvasElement | null,
  props: UseCanvasProps<CID>,
): Contexts[CID] | null {
  const contextRef = useRef<Contexts[CID] | null>(null);

  useEffect(() => {
    if (canvas) {
      const contextId = props.contextId || '2d';
      const context = canvas.getContext(contextId) as Contexts[CID];
      if (context) {
        contextRef.current = context;
        if ('width' in props && 'height' in props) {
          canvas.width = props.width;
          canvas.height = props.height;
          return props.setup?.(context, canvas);
        } else if (props.autoResize) {
          const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            props.resize?.(context, canvas);
          });
          resizeObserver.observe(canvas);
          const cleanup = props.setup?.(context, canvas);
          return () => {
            resizeObserver.disconnect();
            cleanup?.();
          };
        }
      }
    } else {
      contextRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]);

  return contextRef.current;
}
