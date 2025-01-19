type AbortParams = Partial<{
  signal: AbortSignal;
}>

export function loopAnimationFrame(
  callback: FrameRequestCallback,
  { signal }: AbortParams = {},
): number {
  let animationFrame = 0;
  const update = (time: number) => {
    animationFrame = requestAnimationFrame(update);
    callback(time);
  };
  animationFrame = requestAnimationFrame(update);

  if (signal) {
    signal.addEventListener('abort', () => {
      cancelAnimationFrame(animationFrame);
    });
  }

  return animationFrame;
}
