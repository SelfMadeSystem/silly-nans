/**
 * Go look at the [RainBg](/components/RainBg) component for an explanation of
 * how this component works. This component is very similar to the RainBg
 * component.
 */
import { randomId, randomInt } from '../utils/mathUtils';
import { useEffect, useState } from 'react';
import type SyntaxHighlighter from 'react-syntax-highlighter';
import { nightOwl as dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type Options = {
  className: string;
  count: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  animDur: number;
  minSpeedX: number;
  maxSpeedX: number;
  minSpeedY: number;
  maxSpeedY: number;
  time: number;
  minGradientWidth: number;
  maxGradientWidth: number;
  minGradientHeight: number;
  maxGradientHeight: number;
  color: string | string[];
};

type Blob = {
  width: number;
  height: number;
  gradientWidth: number;
  gradientHeight: number;
  speedX: number;
  speedY: number;
  xPos: number;
  yPos: number;
  color: string;
};

function createBlob({
  i,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  minSpeedX,
  maxSpeedX,
  minSpeedY,
  maxSpeedY,
  minGradientWidth,
  maxGradientWidth,
  minGradientHeight,
  maxGradientHeight,
  color,
}: Options & { i: number }): Blob {
  const width = randomInt(minWidth, maxWidth);
  const height = randomInt(minHeight, maxHeight);
  let speedX = randomInt(minSpeedX, maxSpeedX);
  let speedY = randomInt(minSpeedY, maxSpeedY);

  if (speedX === 0 && speedY === 0) {
    if (Math.random() > 0.5) {
      speedX = randomInt(1, maxSpeedX);
    } else {
      speedY = randomInt(1, maxSpeedY);
    }
  }
  return {
    width,
    height,
    speedX,
    speedY,
    xPos: randomInt(0, width),
    yPos: randomInt(0, height),
    gradientWidth: randomInt(minGradientWidth, maxGradientWidth),
    gradientHeight: randomInt(minGradientHeight, maxGradientHeight),
    color: Array.isArray(color) ? color[i % color.length] : color,
  };
}

function createBlobs(count: number, options: Options): Blob[] {
  return Array.from({ length: count }, (_, i) => createBlob({ ...options, i }));
}

function createBlobsStyle(blobs: Blob[]): string {
  return blobs
    .map(
      ({ gradientHeight, gradientWidth, color }) =>
        `radial-gradient(ellipse ${gradientWidth}px ${gradientHeight}px at 50% 50%, ${color} 0%, transparent 100%)`,
    )
    .join(', ');
}

function createBlobsAnimation(blobs: Blob[], animName: string): string {
  let from: string[] = [];
  let to: string[] = [];

  blobs.forEach(({ width, height, speedX, speedY, xPos, yPos }) => {
    const toX = xPos + width * speedX;
    const toY = yPos + height * speedY;

    from.push(`${xPos}px ${yPos}px`);
    to.push(`${toX}px ${toY}px`);
  });

  return `\
@keyframes ${animName} {
  0% {
    background-position: ${from.join(', ')};
  }
  to {
    background-position: ${to.join(', ')};
  }
}`;
}

function createBlobsSize(blobs: Blob[]): string {
  return blobs.map(({ width, height }) => `${width}px ${height}px`).join(', ');
}

const defaultOptions: Options = {
  className: 'blobs-bg',
  count: 8,
  minWidth: 250,
  maxWidth: 1250,
  minHeight: 250,
  maxHeight: 1250,
  animDur: 50,
  minSpeedX: -25,
  maxSpeedX: 25,
  minSpeedY: -25,
  maxSpeedY: 25,
  time: 3,
  minGradientWidth: 50,
  maxGradientWidth: 100,
  minGradientHeight: 50,
  maxGradientHeight: 100,
  color: '#0f0',
};

function generateCssBlobs(opts?: Partial<Options>): string {
  const options = { ...defaultOptions, ...opts };
  const { count, className, time, animDur } = options;
  if (count <= 0) {
    return '';
  }
  const blobs = createBlobs(count, options);

  const animName = `blobs-${randomId()}`;

  return `
.${className} {
  background-image: ${createBlobsStyle(blobs)};
  background-size: ${createBlobsSize(blobs)};
  animation: ${animName} ${time * animDur}s linear infinite;
}

.${className}-over {
  background-image: radial-gradient(
    circle at 50% 50%,
    #0000 0,
    #0000 2px,
    #000 2px
  );
  background-size: 8px 8px;
  backdrop-filter: blur(5em) brightness(5) blur(1em);
}

${createBlobsAnimation(blobs, animName)}
  `;
}

export default function BlobBg({
  options,
  showOpts,
}: {
  options?: Partial<Options>;
  showOpts?: boolean;
}) {
  const [PrismSyntaxHighlighter, setSyntaxHighlighter] = useState<
    typeof SyntaxHighlighter | null
  >(null);

  useEffect(() => {
    const loadSyntaxHighlighter = async () => {
      const { Prism } = await import('react-syntax-highlighter');
      setSyntaxHighlighter(() => Prism);
    };

    loadSyntaxHighlighter();
  }, []);

  const [css, setCss] = useState<string>(generateCssBlobs(options));

  const [count, setCount] = useState<number>(
    options?.count || defaultOptions.count,
  );
  const [minWidth, setMinWidth] = useState<number>(
    options?.minWidth || defaultOptions.minWidth,
  );
  const [maxWidth, setMaxWidth] = useState<number>(
    options?.maxWidth || defaultOptions.maxWidth,
  );
  const [minHeight, setMinHeight] = useState<number>(
    options?.minHeight || defaultOptions.minHeight,
  );
  const [maxHeight, setMaxHeight] = useState<number>(
    options?.maxHeight || defaultOptions.maxHeight,
  );
  const [animDur, setAnimDur] = useState<number>(
    options?.animDur || defaultOptions.animDur,
  );
  const [minSpeedX, setMinSpeedX] = useState<number>(
    options?.minSpeedX || defaultOptions.minSpeedX,
  );
  const [maxSpeedX, setMaxSpeedX] = useState<number>(
    options?.maxSpeedX || defaultOptions.maxSpeedX,
  );
  const [minSpeedY, setMinSpeedY] = useState<number>(
    options?.minSpeedY || defaultOptions.minSpeedY,
  );
  const [maxSpeedY, setMaxSpeedY] = useState<number>(
    options?.maxSpeedY || defaultOptions.maxSpeedY,
  );
  const [time, setTime] = useState<number>(
    options?.time || defaultOptions.time,
  );
  const [minGradientWidth, setMinGradientWidth] = useState<number>(
    options?.minGradientWidth || defaultOptions.minGradientWidth,
  );
  const [maxGradientWidth, setMaxGradientWidth] = useState<number>(
    options?.maxGradientWidth || defaultOptions.maxGradientWidth,
  );
  const [minGradientHeight, setGradientHeight] = useState<number>(
    options?.minGradientHeight || defaultOptions.minGradientHeight,
  );
  const [maxGradientHeight, setMaxGradientHeight] = useState<number>(
    options?.maxGradientHeight || defaultOptions.maxGradientHeight,
  );
  const [color, setColor] = useState<string | string[]>(
    options?.color || defaultOptions.color,
  );

  useEffect(() => {
    let colors = Array.isArray(color) ? color : [color];
    if (colors[0].includes(',')) {
      colors = colors[0].split(',').map(c => c.trim());
    }
    setCss(
      generateCssBlobs({
        className: options?.className || defaultOptions.className,
        count,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        animDur,
        minSpeedX,
        maxSpeedX,
        minSpeedY,
        maxSpeedY,
        time,
        minGradientWidth,
        maxGradientWidth,
        minGradientHeight,
        maxGradientHeight,
        color: colors,
      }),
    );
  }, [
    count,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    animDur,
    minSpeedX,
    maxSpeedX,
    minSpeedY,
    maxSpeedY,
    time,
    minGradientWidth,
    maxGradientWidth,
    minGradientHeight,
    maxGradientHeight,
    color,
  ]);

  // Override the background color to be transparent
  const customStyle = {
    ...dark,
    'pre[class*="language-"]': {
      ...dark['pre[class*="language-"]'],
      background: 'transparent',
    },
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(css.trim()).then(() => {
      alert('CSS copied to clipboard!');
    });
  };

  return (
    <>
      <style>{css}</style>
      {showOpts && (
        <>
          <details className="mx-auto my-4 flex max-w-md flex-col rounded-xl bg-black/50 p-4 text-white backdrop-blur-[1px]">
            <summary>Options</summary>
            <label className="flex flex-row justify-between">
              Count:
              <input
                type="number"
                className="rounded-t-lg border-2 bg-transparent p-1 outline-hidden"
                defaultValue={count}
                onChange={e => setCount(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Width:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minWidth}
                onChange={e => setMinWidth(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Width:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxWidth}
                onChange={e => setMaxWidth(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Height:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minHeight}
                onChange={e => setMinHeight(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Height:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxHeight}
                onChange={e => setMaxHeight(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Animation Duration:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={animDur}
                onChange={e => setAnimDur(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Speed X:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minSpeedX}
                onChange={e => setMinSpeedX(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Speed X:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxSpeedX}
                onChange={e => setMaxSpeedX(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Speed Y:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minSpeedY}
                onChange={e => setMinSpeedY(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Speed Y:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxSpeedY}
                onChange={e => setMaxSpeedY(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Time:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={time}
                onChange={e => setTime(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Gradient Width:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minGradientWidth}
                onChange={e => setMinGradientWidth(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Gradient Width:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxGradientWidth}
                onChange={e => setMaxGradientWidth(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Min Gradient Height:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={minGradientHeight}
                onChange={e => setGradientHeight(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Max Gradient Height:
              <input
                type="number"
                className="border-2 bg-transparent p-1 outline-hidden"
                defaultValue={maxGradientHeight}
                onChange={e => setMaxGradientHeight(parseInt(e.target.value))}
              />
            </label>
            <label className="flex flex-row justify-between">
              Color:
              <input
                type="text"
                className="rounded-b-lg border-2 bg-transparent p-1 outline-hidden"
                defaultValue={color}
                onChange={e => setColor(e.target.value)}
              />
            </label>
          </details>
          <details className="mx-auto my-4 flex max-w-md flex-col rounded-xl bg-black/50 p-4 text-white backdrop-blur-[1px]">
            <summary>Generated CSS</summary>
            {PrismSyntaxHighlighter && (
              <div className="scrollbar-hidden relative max-h-[75vh] overflow-auto">
                <PrismSyntaxHighlighter
                  language="css"
                  className="rounded-lg"
                  style={customStyle}
                >
                  {css.trim()}
                </PrismSyntaxHighlighter>
              </div>
            )}
            <button
              className="absolute right-8 top-12 mt-2 rounded-lg bg-blue-500/90 p-2 text-white"
              onClick={copyToClipboard}
            >
              Copy CSS
            </button>
          </details>
        </>
      )}
    </>
  );
}
