import { Vector2 } from '../vec';
import { useWindowEvent } from './useWindowEvent';
import { type RefObject, useState } from 'react';

function getEl(element: RefObject<HTMLElement | null> | HTMLElement | null) {
  if (element && 'current' in element) {
    return element.current;
  }
  return element;
}

/**
 * Custom React hook that tracks the current pointer (mouse or touch) position
 * on the screen relative to a given element.
 */
export function usePointerPosition(
  element: RefObject<HTMLElement | null> | HTMLElement | null,
  options?: {
    onlyInside?: boolean;
    keepLast?: boolean;
  },
) {
  const { onlyInside = false, keepLast = onlyInside } = options || {};
  const [pos, setPos] = useState<Vector2 | null>(null);

  useWindowEvent('pointermove', e => {
    const el = getEl(element);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      onlyInside &&
      (e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom)
    ) {
      if (keepLast) return;
      setPos(null);
      return;
    }
    setPos(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
  });

  useWindowEvent('touchmove', e => {
    const el = getEl(element);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (onlyInside) {
      let inside = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (
          e.touches[i].clientX >= rect.left &&
          e.touches[i].clientX <= rect.right &&
          e.touches[i].clientY >= rect.top &&
          e.touches[i].clientY <= rect.bottom
        ) {
          inside = true;
          break;
        }
      }
      if (!inside) {
        if (keepLast) return;
        setPos(null);
        return;
      }
    }
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
    if (keepLast) return;
    setPos(null);
  });

  return pos;
}
