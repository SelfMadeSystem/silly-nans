/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

/**
 * Like useEffect, but doesn't run if the dependencies are truthy.
 */
export function useEffectIfFalsey(
  effect: React.EffectCallback,
  deps: React.DependencyList,
) {
  useEffect(() => {
    if (deps.some(dep => !!dep)) return;
    return effect();
  }, deps);
}
