import { useEffect, useRef } from 'react';

/**
 * A custom hook that provides an animation loop using `requestAnimationFrame`.
 * It repeatedly calls the provided callback function with the time delta (`dt`)
 * between the current and the previous frame and the current time (`t`).
 *
 * @param callback - A function that is called on each animation frame. It receives
 *                   the time delta (`dt`) in milliseconds as its argument and the
 *                   current time (`t`) in milliseconds since the page load.
 *
 * @example
 * ```tsx
 * useAnimationLoop((dt) => {
 *   console.log(`Time since last frame: ${dt}ms`);
 * });
 * ```
 *
 * @remarks
 * - The hook internally uses `useRef` to store the timestamp of the last frame
 *   and `useEffect` to manage the animation loop lifecycle.
 * - Make sure to memoize the `callback` function if it depends on external variables
 *   to avoid unnecessary re-renders or restarts of the animation loop.
 */
export function useAnimationLoop(callback: (dt: number, t: number) => void) {
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animationFrameId: number;

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      callback(dt, time);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [callback]);
}
