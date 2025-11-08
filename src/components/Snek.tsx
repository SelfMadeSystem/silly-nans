import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { DIFFERENT_RENDERING_METHODS, Snake } from '../utils/snek';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  fill: '#005500',
  stroke: '#00ff00',
  eyes: '#005500',
};

type SnakeOptions = typeof defaultOptions;

function SnakeComponent({
  snakeRef,
  options: { fill, stroke, eyes },
}: {
  snakeRef: React.RefObject<Snake | null>;
  options: SnakeOptions;
}) {
  const [ctx, canvas, setCanvas] = useCanvas<'2d'>({
    autoResize: true,
    setup: (context, canvas) => {
      context.lineCap = 'round';
      context.lineJoin = 'round';
    },
    resize: (context, canvas) => {
      const origin = new Vector2(canvas.width / 2, canvas.height / 2);
      snakeRef.current = new Snake(origin, 0.2);
    },
  });

  const pointer = usePointerPosition(canvas);
  const prevPointer = useRef<Vector2 | null>(null);

  useAnimationLoop(dt => {
    if (!ctx || !canvas || !snakeRef.current) return;

    const snek = snakeRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mousePos = pointer
      ? new Vector2(pointer.x, pointer.y)
      : new Vector2(canvas.width / 2, canvas.height / 2);
    const mouseMove = prevPointer.current
      ? mousePos.sub(prevPointer.current)
      : new Vector2(0, 0);

    snek.resolve(mousePos, mouseMove, dt);
    snek.display(ctx, fill, stroke, eyes);

    prevPointer.current = mousePos;
  });

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-10 h-full w-full"
      ref={setCanvas}
    />
  );
}

export default function SnakeWrapper() {
  const snakeRef = useRef<Snake | null>(null);
  const [options] = useState<SnakeOptions>({
    ...defaultOptions,
  });
  useEffect(() => {
    function applyRenderingMethod(
      method: keyof typeof DIFFERENT_RENDERING_METHODS,
    ) {
      if (!snakeRef.current) return;
      const renderingMethods = DIFFERENT_RENDERING_METHODS[method];
      for (const key in renderingMethods) {
        if (key === 'setStuff') {
          // @ts-ignore
          renderingMethods['setStuff'].call(snakeRef.current);
          continue;
        }
        // @ts-ignore
        if (typeof renderingMethods[key] === 'function') {
          // @ts-ignore
          snakeRef.current[key] = renderingMethods[key].bind(snakeRef.current);
        } else {
          // @ts-ignore
          snakeRef.current[key] = renderingMethods[key];
        }
      }
    }

    const pane = new Pane();

    {
      const optionsFolder = pane.addFolder({
        title: 'Options',
        expanded: true,
      });

      optionsFolder.addBinding(options, 'fill', { label: 'Fill Color' });
      optionsFolder.addBinding(options, 'stroke', { label: 'Stroke Color' });
      optionsFolder.addBinding(options, 'eyes', { label: 'Eyes Color' });

      for (const methodName in DIFFERENT_RENDERING_METHODS) {
        optionsFolder
          .addButton({
            title: `Use "${methodName}" rendering`,
          })
          .on('click', () => {
            applyRenderingMethod(
              methodName as keyof typeof DIFFERENT_RENDERING_METHODS,
            );
          });
      }
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <SnakeComponent snakeRef={snakeRef} options={options} />;
}
