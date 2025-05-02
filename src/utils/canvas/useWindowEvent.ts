import { useEffect } from 'react';

/**
 * useWindowEvent is a custom hook that allows you to add and remove event listeners
 * to the window object. It takes an event type, a callback function, and an optional
 * dependency array.
 *
 * @param {string} eventType - The type of the event to listen for (e.g., 'resize', 'scroll').
 * @param {Function} callback - The function to call when the event is triggered.
 */
export const useWindowEvent = <T extends keyof WindowEventMap>(
  eventType: T,
  callback: (event: WindowEventMap[T]) => void,
) => {
  useEffect(() => {
    // Check if the event type is valid
    if (typeof window !== 'undefined' && window.addEventListener) {
      // Define the event handler
      const eventHandler = (event: WindowEventMap[T]) => {
        callback(event);
      };

      // Add the event listener to the window object
      window.addEventListener(eventType, eventHandler);

      // Cleanup function to remove the event listener
      return () => {
        window.removeEventListener(eventType, eventHandler);
      };
    }
  }, [eventType, callback]);
};
