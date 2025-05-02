import { useEffect, useRef } from 'react';

/**
 * A custom hook that provides a way to run an animation loop using requestAnimationFrame.
 */
export function useAnimationLoop(callback: (dt: number) => void) {
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animationFrameId: number;

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      callback(dt);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [callback]);
}
