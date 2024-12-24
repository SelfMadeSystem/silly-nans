import { useEffect, useRef } from "react";

/**
 * Because literally no library has a hook for this for some reason
 */
export function useMount(callback: () => (void | (() => void))) {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return callback();
    }
  }, []);
}