/**
 * Matrix effect within a canvas element.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
import { clamp, mod, randomInt, randomLog, floorMultiple } from 'nans-canvas/utils/mathUtils';
import { createCanvasEffect } from 'nans-canvas';
import { CanvasEffect } from 'nans-canvas/react';

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

export type MatrixProps = {
  trailColor?: string;
  dropColor?: string;
  charOpacity?: number;
  speed?: [number, number];
  fontSize?: number;
  className?: string;
  columns?: number;
  rows?: number;
};

const chars =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()+-=[]{};:',.<>?/".split(
    '',
  );

const randChar = () => chars[randomInt(0, chars.length - 1)];

const matrixEffect = createCanvasEffect(
  { contextId: '2d', scrollable: true },
  ({
    trailColor = '#0F0',
    dropColor = trailColor,
    charOpacity = 0.1,
    speed = [0.1, 0.3],
    fontSize = 14,
    columns = 50,
    rows = 30,
  }: MatrixProps) => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const randSpeed = () => randomLog(...speed);

    const columnsArray: MatrixColumn[] = Array.from(
      { length: columns },
      () => ({
        pos: randomInt(0, rows),
        speed: randSpeed(),
        chars: Array.from({ length: rows }, randChar),
      }),
    );

    const tile = document.createElement('canvas');
    const tileCtx = tile.getContext('2d')!;
    let pixelRatio = 1;
    let cssWidth = 0;
    let cssHeight = 0;

    const resetColumn = (col: MatrixColumn) => {
      col.chars[0] = randChar();
      col.pos = 0;
      col.speed = randSpeed();
    };

    const drawTile = () => {
      tileCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      tileCtx.clearRect(0, 0, columns * fontSize, rows * fontSize);
      tileCtx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const { pos, chars } = columnsArray[i];
        const fPos = Math.floor(pos);

        for (let j = 0; j < Math.min(chars.length, rows); j++) {
          tileCtx.globalAlpha = clamp(
            1 - mod(fPos - j, rows) * charOpacity,
            0,
            1,
          );
          tileCtx.fillStyle = j === fPos ? dropColor : trailColor;
          tileCtx.fillText(chars[j], i * fontSize, (j + 1) * fontSize);
        }
      }
    };

    const step = () => {
      for (const col of columnsArray) {
        const { pos, speed, chars } = col;

        // Change the character when the position goes to the next integer.
        if (pos + speed < rows && Math.floor(pos + speed) > pos) {
          chars[Math.floor(pos + speed)] = randChar();
        }

        col.pos += speed;

        if (pos > rows) resetColumn(col);
      }
    };

    if (prefersReducedMotion) {
      for (let i = 0; i < rows; i++) step();
    }

    return {
      onResize(size) {
        pixelRatio = size.pixelRatio;
        cssWidth = size.cssWidth;
        cssHeight = size.cssHeight;
        tile.width = Math.round(columns * fontSize * pixelRatio);
        tile.height = Math.round(rows * fontSize * pixelRatio);
        drawTile();
      },
      draw({ ctx, scroll }) {
        if (!prefersReducedMotion) {
          step();
          drawTile();
        }

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        const tileWidth = columns * fontSize;
        const tileHeight = rows * fontSize;
        const floorScroll = floorMultiple(scroll.pixels.y, tileHeight);
        for (let x = 0; x < cssWidth; x += tileWidth) {
          for (let y = floorScroll; y < cssHeight + floorScroll; y += tileHeight) {
            ctx.drawImage(tile, x, y - scroll.pixels.y, tileWidth, tileHeight);
          }
        }
      },
    };
  },
);

/**
 * The Matrix component.
 *
 * Draws a fancy matrix
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
const Matrix = ({
  options = {},
  ...props
}: { options?: MatrixProps } & React.HTMLAttributes<HTMLCanvasElement>) => {
  return <CanvasEffect effect={matrixEffect} options={options} {...props} />;
};

export default Matrix;
