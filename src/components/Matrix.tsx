/**
 * Matrix effect within a double helix (DNA) structure.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
import { clamp, isInView, mod, randomInt, randomLog } from '../utils/mathUtils';
import { useEffect, useRef } from 'react';

/**
 * A column in the matrix.
 *
 * @property pos The position of the column
 * @property speed The speed of the column
 * @property chars The character of the column
 * @property randomTextIndex The index of the random text. -1 if not part of the random text
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export type MatrixColumn = {
  pos: number;
  speed: number;
  chars: string[];
};

/**
 * The Matrix component.
 *
 * Draws a fancy matrix
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
const Matrix = ({
  trailColor = '#0F0',
  dropColor = trailColor,
  charOpacity = 0.1,
  speed = [0.1, 0.3],
  fontSize = 14,
  className = '',
  columns = 50,
  rows = 30,
}: {
  trailColor?: string;
  dropColor?: string;
  charOpacity?: number;
  speed?: [number, number];
  fontSize?: number;
  className?: string;
  columns?: number;
  rows?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const columnsArray: MatrixColumn[] = [];
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const matrixCanvas = document.createElement('canvas');
    if (!matrixCanvas) return;
    const matrixCtx = matrixCanvas.getContext('2d')!;
    if (!matrixCtx) return;
    matrixCanvas.width = columns * fontSize;
    matrixCanvas.height = rows * fontSize;

    let width = (canvas.width = canvas.clientWidth);
    let height = (canvas.height = canvas.clientHeight);

    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()+-=[]{};:',.<>?/".split(
        '',
      );

    /**
     * Returns a random character.
     * @returns The random character
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-08
     */
    const randChar = () => chars[randomInt(0, chars.length - 1)];

    /**
     * Returns a random speed between the min and max speed. Uses a logarithmic distribution.
     *
     * @returns The random speed
     * @see randomLog
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const randSpeed = () => randomLog(...speed);

    /**
     * Creates a column in the matrix.
     *
     * - Randomly chooses a list of characters from the random text or the normal characters.
     * - Sets the position to a random position in the column.
     * - Sets the speed to a random speed.
     *
     * @returns The created column
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const createColumn = (): MatrixColumn => {
      let chars: string[] = [];
      chars = Array.from({ length: Math.floor(height / fontSize) }, randChar);

      return {
        pos: randomInt(0, height / fontSize),
        speed: randSpeed(),
        chars,
      };
    };

    /**
     * Resets a column in the matrix.
     *
     * - Randomly chooses a character from the random text or the normal characters.
     * - Sets the position to 0.
     * - Sets the speed to a random speed.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const resetColumn = (col: MatrixColumn) => {
      col.chars[0] = randChar();
      col.pos = 0;
      col.speed = randSpeed();
    };

    /**
     * Draws the matrix.
     *
     * - Fills the background with a transparent black color.
     * - Iterates over each column and draws the character at the position.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const drawMatrix = (draw = true) => {
      if (columnsArray.length < columns) {
        for (let i = columnsArray.length; i < columns; i++) {
          columnsArray.push(createColumn());
        }
      }

      matrixCtx.clearRect(0, 0, width, height);
      matrixCtx.fillStyle = trailColor;
      matrixCtx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const { pos, speed, chars } = columnsArray[i];

        const fPos = Math.floor(pos);

        // Draw the character at the position.
        if (draw) {
          for (let j = 0; j < Math.min(chars.length, rows); j++) {
            const char = chars[j];
            matrixCtx.globalAlpha = clamp(
              1 - mod(fPos - j, rows) * charOpacity,
              0,
              1,
            );
            matrixCtx.fillStyle = j === fPos ? dropColor : trailColor;
            matrixCtx.fillText(char, i * fontSize, (j + 1) * fontSize);
          }
        }
        // Change the character when the position goes to the next integer.
        if (pos + speed < rows && Math.floor(pos + speed) > pos) {
          const newPos = Math.floor(pos + speed);
          columnsArray[i].chars[newPos] = chars[randomInt(0, chars.length - 1)];
        }

        columnsArray[i].pos += speed;

        // Reset the column if it goes out of bounds.
        if (pos > rows) {
          resetColumn(columnsArray[i]);
        }
      }
    };

    /**
     * Draws the matrix canvas onto the main canvas.
     */
    const drawMatrixCanvas = () => {
      ctx.clearRect(0, 0, width, height);
      const xIters = Math.ceil(width / matrixCanvas.width);
      const yIters = Math.ceil(height / matrixCanvas.height);

      for (let i = 0; i < xIters; i++) {
        for (let j = 0; j < yIters; j++) {
          ctx.drawImage(matrixCanvas, i * matrixCanvas.width, j * matrixCanvas.height);
        }
      }
    }

    /**
     * Draws the matrix.
     *
     * - Draws the matrix.
     * - Requests the next animation frame.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const draw = () => {
      const inView = isInView(canvas);

      drawMatrix(inView);
      drawMatrixCanvas();

      if (prefersReducedMotion) return;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    const initDraw = () => {
      if (prefersReducedMotion) {
        for (let i = 0; i < rows; i++) {
          drawMatrix();
        }
        draw();
      } else {
        draw();
      }
    };

    /**
     * Resizes the canvas.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const resize = () => {
      width = canvas.width = canvas.clientWidth;
      height = canvas.height = canvas.clientHeight;
      cancelAnimationFrame(animationFrameRef.current);
      initDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    initDraw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      observer.disconnect();
    };
    // react was being stupid so I removed the dependencies. It should work fine without them.
    // react isn't really made for these kinds of elements. It's used to having
    // to do all the heavy lifting for you. So when you do something like this,
    // you can just give react a break and tell it to not worry about it. You
    // can let it hope and pray that you know what you're doing (lol).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
    </>
  );
};

export default Matrix;
