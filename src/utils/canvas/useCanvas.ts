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
 * A utility function to manage and configure a canvas element.
 *
 * @param canvas - The HTMLCanvasElement to be used. Pass `null` if no canvas is available.
 * @param props - Configuration options for the canvas. It can either be:
 *   - An object with `width` and `height` properties to set the canvas dimensions.
 *   - An object with `autoResize` set to `true` to enable automatic resizing.
 * @returns The 2D rendering context of the canvas if available, otherwise `null`.
 *
 * @example
 *
 * ```tsx
 * import { useCanvas } from './useCanvas';
 *
 * function MyComponent() {
 *   const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
 *   const context = useCanvas(canvas, { width: 800, height: 600 });
 *
 *   useEffect(() => {
 *     if (context) {
 *       context.fillStyle = 'red';
 *       context.fillRect(0, 0, 100, 100);
 *     }
 *   }, [context]);
 *
 *   return <canvas ref={setCanvas} />;
 * }
 * ```
 *
 * @remarks
 * - The `setup` function is called after the context is created and can be used to perform
 *   additional setup tasks. It can return a cleanup function that will be called when the
 *   component unmounts or when the canvas changes.
 * - The `resize` function is called when the canvas is resized if `autoResize` is enabled.
 * - The `contextId` property allows you to specify the type of rendering context you want to use.
 *   The default is `'2d'`, but you can also use `'bitmaprenderer'`, `'webgl'`, or `'webgl2'`.
 * - The `width` and `height` properties are used to set the canvas dimensions when the
 *   `autoResize` option is not enabled. If both `width` and `height` are provided, the canvas
 *   will be resized to those dimensions.
 * - The `autoResize` option allows the canvas to automatically resize to fit its container.
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
