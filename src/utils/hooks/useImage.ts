import { useEffect, useState } from 'react';

type UseImageResult = [HTMLImageElement | null, boolean, Error | null];

/**
 * A React hook for loading an image.
 *
 * @param src - The source URL of the image.
 * @param crossOrigin - The crossOrigin attribute for the image (optional).
 * @returns A tuple containing the loaded image (or null), a loading state, and an error (or null).
 */
export function useImage(
  src: string | null,
  crossOrigin?: string,
): UseImageResult {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      setLoading(false);
      setError(null);
      return;
    }

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    const handleLoad = () => {
      setImage(img);
      setLoading(false);
      setError(null);
    };

    const handleError = (e: ErrorEvent) => {
      setImage(null);
      setLoading(false);
      setError(new Error(`Failed to load image: ${e.message}`));
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    setLoading(true);
    img.src = src;

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, crossOrigin]);

  return [image, loading, error];
}
