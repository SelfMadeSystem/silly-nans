import { useEffect } from 'react';

// Yoinked from:
// https://github.com/mantinedev/mantine/blob/ac3b2922e7d3a2026a44c1b3fd549886d5a2174d/packages/%40mantine/hooks/src/use-window-event/use-window-event.ts

/**
 * A custom React hook for adding and cleaning up event listeners on the `window` object.
 *
 * @template K - The type of the event name. It can be a key from `WindowEventMap` or a custom string.
 *
 * @param type - The name of the event to listen for. If it matches a key in `WindowEventMap`,
 *               the listener will be strongly typed to the corresponding event type.
 * @param listener - The callback function to handle the event. If the event type is a key in
 *                   `WindowEventMap`, the listener will receive the corresponding event object.
 *                   Otherwise, it will receive a `CustomEvent`.
 * @param options - Optional options for the event listener. Can be a boolean or an object of type
 *                  `AddEventListenerOptions`.
 *
 * @remarks
 * This hook automatically adds the event listener when the component mounts and removes it when
 * the component unmounts or when any of the dependencies (`type`, `listener`, `options`) change.
 *
 * @example
 * ```tsx
 * useWindowEvent('resize', (event) => {
 *   console.log('Window resized:', event);
 * });
 *
 * useWindowEvent('custom-event', (event) => {
 *   console.log('Custom event triggered:', event.detail);
 * });
 * ```
 */
export function useWindowEvent<K extends string>(
  type: K,
  listener: K extends keyof WindowEventMap
    ? (this: Window, ev: WindowEventMap[K]) => void
    : (this: Window, ev: CustomEvent) => void,
  options?: boolean | AddEventListenerOptions,
) {
  useEffect(() => {
    window.addEventListener(type as any, listener, options);
    return () => window.removeEventListener(type as any, listener, options);
  }, [type, listener, options]);
}
