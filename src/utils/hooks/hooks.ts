/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';

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

/**
 * Gets the previous value of a state or prop.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
