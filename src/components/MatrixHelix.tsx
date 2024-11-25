/**
 * Matrix effect within a double helix (DNA) structure.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
import { useEffect, useRef } from "react";
import { clamp, isInView, mod, randomInt, randomLog } from "../utils/mathUtils";

/**
 * A column in the matrix.
 *
 * @property pos The position of the column
 * @property speed The speed of the column
 * @property char The current character
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export type MatrixColumn = {
  pos: number;
  speed: number;
  char: string;
};

/**
 * The MatrixHelix component.
 *
 * It works by creating a matrix effect and then clipping it into a double helix structure.
 *
 * I'm not going to list out all the parameters. Figure it out yourself if you :)
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
const MatrixHelix = ({
  color = "#0F0",
  speed = [0.25, 0.75],
  fontSize = 14,
  lowerOpacity = 0.5,
  upperOpacity = 1,
  helixSpeed = 0.01,
  minWidth = 0.9, // in % of the canvas width
  maxWidth = 450, // in pixels
  sideOffset = 0.4,
  sideWidth = 0.2,
  sideHeight = 1,
}: {
  color?: string;
  speed?: [number, number];
  fontSize?: number;
  lowerOpacity?: number;
  upperOpacity?: number;
  helixSpeed?: number;
  minWidth?: number;
  maxWidth?: number;
  sideOffset?: number;
  sideWidth?: number;
  sideHeight?: number;
  bars?: number;
  barWidth?: number;
  barSpeed?: number;
}) => {
  const canvasLowerRef = useRef<HTMLCanvasElement | null>(null);
  const canvasUpperRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const columnsArray: MatrixColumn[] = [];
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvasLower = canvasLowerRef.current;
    if (!canvasLower) return;
    const ctxLower = canvasLower.getContext("2d");
    if (!ctxLower) return;
    const canvasUpper = canvasUpperRef.current;
    if (!canvasUpper) return;
    const ctxUpper = canvasUpper.getContext("2d");
    if (!ctxUpper) return;

    /**
     * Rounds a number to the nearest multiple of the font size.
     * This is used to ensure that the matrix columns are aligned to the font size.
     *
     * @param n The number to round
     * @returns The rounded number
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const roundToFontSize = (n: number) => Math.floor(n / fontSize) * fontSize;

    const matrixCanvas = new OffscreenCanvas(roundToFontSize(300), roundToFontSize(600));
    const matrixCtx = matrixCanvas.getContext("2d")!;

    let width = (canvasUpper.width = canvasLower.width = canvasLower.clientWidth);
    let height = (canvasUpper.height = canvasLower.height = canvasLower.clientHeight);

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()+-=[]{};:',.<>?/".split("");

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
     * - Randomly chooses a character from the random text or the normal characters.
     * - Sets the position to a random position in the column.
     * - Sets the speed to a random speed.
     *
     * @returns The created column
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const createColumn = () => {
      let char = "";
      char = chars[randomInt(0, chars.length - 1)];

      return {
        pos: randomInt(0, height / fontSize),
        speed: randSpeed(),
        char,
      };
    };

    /**
     * Resets a column in the matrix.
     *
     * - Randomly chooses a character from the random text or the normal characters.
     * - Sets the position to 0.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const resetColumn = (col: MatrixColumn) => {
      col.char = chars[randomInt(0, chars.length - 1)];
      col.pos = 0;
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
      const width = matrixCanvas.width;
      const height = matrixCanvas.height;

      const columns = Math.floor(width / fontSize);
      if (columnsArray.length < columns) {
        for (let i = columnsArray.length; i < columns; i++) {
          columnsArray.push(createColumn());
        }
      }

      matrixCtx.fillStyle = "rgba(0, 0, 0, 0.02)";
      matrixCtx.fillRect(0, 0, width, height);
      matrixCtx.fillStyle = color;
      matrixCtx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const { pos, speed, char } = columnsArray[i];

        if (draw) matrixCtx.fillText(char, i * fontSize, Math.floor(pos) * fontSize);

        // Reset the column if it goes out of bounds.
        if (pos * fontSize > height) {
          resetColumn(columnsArray[i]);
        }

        // Change the character when the position goes to the next integer.
        if (Math.floor(pos + speed) > pos) {
          columnsArray[i].char = chars[randomInt(0, chars.length - 1)];
        }

        columnsArray[i].pos += speed;
      }
    };

    /**
     * Clips the matrix into a double helix structure.
     *
     * - Complex math lol (not that complex, just some bezier curves)
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const helixClip = () => {
      // idk what to name this variable lol
      const calculatedWidth = Math.min(width * minWidth, maxWidth);
      const halfW = width / 2;
      const sideHeightPx = sideHeight * calculatedWidth;
      const sideWidthPx = sideWidth * calculatedWidth;
      const sideFromCenterPx = calculatedWidth / 2;
      const sideOffsetPx = sideOffset * calculatedWidth;
      const repititions = Math.ceil(height / sideHeightPx) + 2;
      const offset = ((Date.now() * helixSpeed * height * 0.01) % sideHeightPx) - 1.5 * sideHeightPx;

      for (const [ctx, off, s] of [
        [ctxLower, 0, 1],
        [ctxUpper, 0.5, -1],
      ] as const) {
        ctx.beginPath();

        // View the following link for an illustration of the helix structure:
        // https://github.com/user-attachments/assets/0a705855-3da0-4aa8-b91e-cf7697c4674c
        // idk if this link will work in the future, but you can try lol
        for (let i = 0; i <= repititions; i++) {
          for (let j = 0; j <= sideOffsetPx; j += sideOffsetPx || 1) {
            // Basically, the helix curves from bottom right to top left, then
            // goes up a bit, then curves from top left to bottom right, then goes down a bit.
            const y = (i + off) * sideHeightPx + offset + j;
            const x1 = halfW - sideFromCenterPx * s;
            const y1 = y;
            const x2 = x1;
            const y2 = y + sideHeightPx / 4;
            const x3 = halfW + sideFromCenterPx * s;
            const y3 = y2;
            const x4 = x3;
            const y4 = y + sideHeightPx / 2;

            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineTo(x4, y4 + sideWidthPx);
            ctx.bezierCurveTo(x3, y3 + sideWidthPx, x2, y2 + sideWidthPx, x1, y1 + sideWidthPx);
            ctx.closePath();
          }

          /* // Draw the bars
          const p1: Vec2 = [halfW - sideFromCenterPx * s, (i + off) * sideHeightPx + offset + sideHeightPx / 2];
          const p2: Vec2 = [p1[0], p1[1] + sideHeightPx / 4];
          const p3: Vec2 = [halfW + sideFromCenterPx * s, p2[1]];
          const p4: Vec2 = [p3[0], p1[1] + sideHeightPx / 2];
          const barOffset =
            ((Date.now() * barSpeed * calculatedWidth * 0.01) % (sideFromCenterPx / bars)) / sideFromCenterPx;
          for (let j = -1; j < bars; j++) {
            const t1 = clamp(j / bars + barOffset, 0, 1);
            const t2 = clamp((j + barWidth) / bars + barOffset, 0, 1);
            const b1: Vec2 = bezier(p1, p2, p3, p4, t1);
            const b2: Vec2 = bezier(p1, p2, p3, p4, t2);
            const b3: Vec2 = [b2[0], b2[1] - sideOffsetPx];
            const b4: Vec2 = [b1[0], b1[1] - sideOffsetPx];

            ctx.moveTo(...b1);
            ctx.lineTo(...b4);
            ctx.lineTo(...b3);
            ctx.lineTo(...b2);
            ctx.closePath();
          } */
        }
        // ctx.fillStyle = "#f00";
        // ctx.fill();
        // ctx.strokeStyle = "#fff";
        // ctx.lineWidth = 4;
        // ctx.stroke();
        ctx.clip("nonzero");
      }
    };

    /**
     * Draws the image.
     *
     * - Draws the matrix image with an offset.
     *
     * @param ctx The context to draw the image on
     */
    const drawImage = () => {
      const now = Date.now() * 0.01;
      const mWidth = matrixCanvas.width;
      const mHeight = matrixCanvas.height;
      const horiztonalOffset = 0.002;
      const verticalOffset = 0.008;

      // You know, I don't need a for loop here.
      for (const [ctx, offsetX, offsetY] of [
        [ctxLower, (now * horiztonalOffset * width) % mWidth, (now * verticalOffset * height) % mHeight],
        [ctxUpper, -((now * horiztonalOffset * width) % mWidth), (now * verticalOffset * height) % mHeight],
      ] as const) {
        // Since we're using `.clip` and not `globalCompositeOperation`, we can
        // draw the image multiple times without it looking weird.
        for (let x = mod(offsetX, mWidth) - mWidth; x < width; x += mWidth) {
          for (let y = mod(offsetY, mHeight) - mHeight; y < height; y += mHeight) {
            ctx.drawImage(matrixCanvas, x, y);
          }
        }
      }
    };

    /**
     * Draws the matrix and the helix structure.
     *
     * - Draws the matrix.
     * - Clears the canvas.
     * - Saves the context.
     * - Clips the helix structure.
     * - Draws the image.
     * - Restores the context.
     * - Requests the next animation frame.
     *
     * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
     */
    const draw = () => {
      const inView = isInView(canvasLower);

      drawMatrix(inView);

      if (!inView && !prefersReducedMotion) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      for (const ctx of [ctxLower, ctxUpper]) {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
      }

      helixClip();
      drawImage();

      for (const ctx of [ctxLower, ctxUpper]) {
        ctx.restore();
      }

      if (prefersReducedMotion) return;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    const initDraw = () => {
      if (prefersReducedMotion) {
        for (let i = 0; i < matrixCanvas.height / fontSize; i++) {
          drawMatrix();
        }
        if (canvasUpperRef.current) canvasUpperRef.current.style.zIndex = "-1";

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
      width = canvasUpper.width = canvasLower.width = canvasLower.clientWidth;
      height = canvasUpper.height = canvasLower.height = canvasLower.clientHeight;
      cancelAnimationFrame(animationFrameRef.current);
      initDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvasLower);

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
        ref={canvasLowerRef}
        style={{ position: "absolute", zIndex: -1, width: "100%", height: "100%", opacity: lowerOpacity }}
      />
      <canvas
        ref={canvasUpperRef}
        style={{ position: "absolute", zIndex: -1, width: "100%", height: "100%", opacity: upperOpacity }}
      />
    </>
  );
};

export default MatrixHelix;
