import { Vector2 } from '../vec';
import { useWindowEvent } from './useWindowEvent';
import { type RefObject, useState } from 'react';

/**
 * Custom React hook that tracks the current pointer (mouse or touch) position
 * on the screen relative to a given element.
 */
export function usePointerPosition(element: RefObject<HTMLElement>) {
  const [pos, setPos] = useState<Vector2 | null>(null);

  useWindowEvent('pointermove', e => {
    if (!element.current) return;
    const rect = element.current.getBoundingClientRect();
    setPos(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
  });

  useWindowEvent('touchmove', e => {
    if (!element.current) return;
    const rect = element.current.getBoundingClientRect();
    if (e.touches.length > 0) {
      setPos(
        new Vector2(
          e.touches[0].clientX - rect.left,
          e.touches[0].clientY - rect.top,
        ),
      );
    }
  });

  useWindowEvent('pointerleave', () => {
    setPos(null);
  });

  return pos;
}
