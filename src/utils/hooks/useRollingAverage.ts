import { Vector2 } from '../vec';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook that calculates the rolling average of a numeric value over a specified window size.
 * @param value The current numeric value to include in the rolling average.
 * @param windowSize The number of recent values to consider for the average.
 * @returns The rolling average of the last `windowSize` values and a function to reset the history.
 */
export function useRollingAverage(
  value: number,
  windowSize: number,
): [number, () => void] {
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    setHistory(prev => {
      const newHistory = [...prev, value];
      if (newHistory.length > windowSize) {
        newHistory.shift(); // Remove oldest value to maintain window size
      }
      return newHistory;
    });
  }, [value, windowSize]);

  const average =
    history.reduce((sum, val) => sum + val, 0) / (history.length || 1);

  const resetAverage = useCallback(() => {
    setHistory([]);
  }, []);

  return [average, resetAverage];
}
