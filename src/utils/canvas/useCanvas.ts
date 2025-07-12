import { useEffect, useState } from 'react';

type Contexts = {
  '2d': CanvasRenderingContext2D;
  bitmaprenderer: ImageBitmapRenderingContext;
  webgl: WebGLRenderingContext;
  webgl2: WebGL2RenderingContext;
};

type ContextId = keyof Contexts;

type ContextAttributes =
  | CanvasRenderingContext2DSettings
  | WebGLContextAttributes
  | ImageBitmapRenderingContextSettings
  | undefined;

type UseCanvasProps<CID extends ContextId> = {
  contextId?: CID;
  contextAttributes?: ContextAttributes;
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
 * @param props - Configuration options for the canvas. It can either be:
 *   - An object with `width` and `height` properties to set the canvas dimensions.
 *   - An object with `autoResize` set to `true` to enable automatic resizing.
 * @returns An array containing:
 * - The rendering context of the canvas (or null if not available).
 * - The canvas element (or null if not available).
 * - A function to set the canvas element. Pass this function to the `ref` prop of the canvas element.
 *
 * @example
 *
 * ```tsx
 * import { useCanvas } from './useCanvas';
 *
 * function MyComponent() {
 *   const [context, canvas, setCanvas] = useCanvas(canvas, { width: 800, height: 600 });
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
 * - The `contextAttributes` property allows you to specify attributes for the rendering context.
 * - The `width` and `height` properties are used to set the canvas dimensions when the
 *   `autoResize` option is not enabled. If both `width` and `height` are provided, the canvas
 *   will be resized to those dimensions.
 * - The `autoResize` option allows the canvas to automatically resize to fit its container.
 */
export function useCanvas(
  props:
    | {
        width: number;
        height: number;
      }
    | {
        autoResize: true;
      },
): [
  CanvasRenderingContext2D | null,
  HTMLCanvasElement | null,
  React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>,
];
export function useCanvas<CID extends ContextId>(
  props: UseCanvasProps<CID>,
): [
  Contexts[CID] | null,
  HTMLCanvasElement | null,
  React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>,
];
export function useCanvas<CID extends ContextId>(
  props: UseCanvasProps<CID>,
): [
  Contexts[CID] | null,
  HTMLCanvasElement | null,
  React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>,
] {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<Contexts[CID] | null>(null);

  useEffect(() => {
    if (canvas) {
      const contextId = props.contextId || '2d';
      // Pass contextAttributes if provided
      const context =
        props.contextAttributes !== undefined
          ? (canvas.getContext(
              contextId,
              props.contextAttributes,
            ) as Contexts[CID])
          : (canvas.getContext(contextId) as Contexts[CID]);
      if (context) {
        setCtx(context);
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
      } else {
        console.error(`Failed to get context: ${contextId}`);
        setCtx(null);
      }
    } else {
      setCtx(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, props.contextAttributes]);

  return [ctx, canvas, setCanvas] as const;
}
