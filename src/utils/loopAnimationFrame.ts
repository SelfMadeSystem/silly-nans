import type { AbortParams } from './abortable';

export function loopAnimationFrame(
  callback: (time: number) => void | false,
  { signal }: AbortParams = {},
): number {
  let animationFrame = 0;
  const update = (time: number) => {
    animationFrame = requestAnimationFrame(update);
    if (callback(time) === false) {
      cancelAnimationFrame(animationFrame);
    }
  };
  animationFrame = requestAnimationFrame(update);

  if (signal) {
    signal.addEventListener('abort', () => {
      cancelAnimationFrame(animationFrame);
    });
  }

  return animationFrame;
}
