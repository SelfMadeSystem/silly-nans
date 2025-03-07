/**
 * This script creates a rain effect using only CSS `background-*` properties and `animation`.
 *
 * The effect is achieved by using two intersecting `radial-gradient`s to simulate raindrops.
 * - The first two gradients create the elongated part of the raindrop.
 * - The third gradient forms the circular bottom of the raindrop.
 *
 * You can't use `linear-gradient` for this effect because it won't repeat horizontally with
 * a gap unless you hide all the other gradients behind it.
 *
 * The gradients are positioned and translated to intersect and form the raindrop shape.
 * The animation is created by moving the background position of the gradients from top to bottom.
 *
 * Since individual gradient positions can't be animated separately, the animation duration and
 * end positions are multiplied by large numbers to create the illusion of varying speeds.
 */
import { randomId, randomInt } from '../utils/mathUtils';
import { useEffect, useState } from 'react';
import type SyntaxHighlighter from 'react-syntax-highlighter';
import { nightOwl as dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type Options = {
  className: string;
  count: number;
  width: number;
  minHeight: number;
  maxHeight: number;
  animDur: number;
  minSpeed: number;
  maxSpeed: number;
  time: number;
  dropWidth: number;
  gradientWidth: number;
  gradientHeight: number;
  color: string | string[];
};

type Raindrop = {
  height: number;
  speed: number;
  pos: number;
  yPos: number;
  color: string;
};

function createRaindrop(
  pos: number,
  { minHeight, maxHeight, minSpeed, maxSpeed, color }: Options,
): Raindrop {
  const height = randomInt(minHeight, maxHeight);
  return {
    height,
    speed: randomInt(minSpeed, maxSpeed),
    yPos: randomInt(0, height),
    pos,
    color: Array.isArray(color) ? color[randomInt(0, color.length - 1)] : color,
  };
}

function createRaindrops(count: number, options: Options): Raindrop[] {
  const { width } = options;
  return Array.from({ length: count }, (_, i) =>
    createRaindrop((i * width) / count, options),
  );
}

function createRaindropsStyle(
  raindrop: Raindrop[],
  { dropWidth, gradientWidth, gradientHeight, width }: Options,
): string {
  return raindrop
    .map(
      ({ height, color }) => `
    radial-gradient(${gradientWidth}px ${gradientHeight}px at 0px ${height}px, ${color}, #0000),
    radial-gradient(${gradientWidth}px ${gradientHeight}px at ${width}px ${height}px, ${color}, #0000),
    radial-gradient(${dropWidth / 2}px ${dropWidth / 2}px at ${width / 2}px ${height / 2}px, ${color} 100%, #0000 150%)`,
    )
    .join(', ');
}

function createRaindropsAnimation(
  raindrop: Raindrop[],
  animName: string,
  { width, dropWidth }: Options,
): string {
  let from: string[] = [];
  let to: string[] = [];

  raindrop.forEach(({ height, speed, pos, yPos: yp }) => {
    const fy = height * speed + yp;
    from.push(
      `${pos}px ${yp}px, ${pos + dropWidth}px ${yp}px, ${width / 2 + dropWidth / 2 + pos}px ${height / 2 + yp}px`,
    );
    to.push(
      `${pos}px ${fy}px, ${pos + dropWidth}px ${fy}px, ${width / 2 + dropWidth / 2 + pos}px ${height / 2 + fy}px`,
    );
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

function createRaindropSize(raindrop: Raindrop[], { width }: Options): string {
  return raindrop
    .map(
      ({ height }) =>
        `${width}px ${height}px, ${width}px ${height}px, ${width}px ${height}px`,
    )
    .join(', ');
}

const defaultOptions: Options = {
  className: 'rain-bg',
  count: 12,
  width: 300,
  minHeight: 100,
  maxHeight: 300,
  animDur: 50,
  minSpeed: 25,
  maxSpeed: 75,
  time: 3,
  dropWidth: 3,
  gradientWidth: 4,
  gradientHeight: 100,
  color: '#0f0',
};

function generateCssRain(options?: Options): string {
  options = { ...defaultOptions, ...options };
  const { count, className, time, animDur } = options;
  if (count <= 0) {
    return '';
  }
  const raindrop = createRaindrops(count, options);

  const animName = `rain-${randomId()}`;

  return `
.${className} {
  background-image: ${createRaindropsStyle(raindrop, options)};
  background-size: ${createRaindropSize(raindrop, options)};
  animation: ${animName} ${time * animDur}s linear infinite;
}

${createRaindropsAnimation(raindrop, animName, options)}
  `;
}

export default function RainBg({ options }: { options?: Options }) {
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

  const [css, setCss] = useState<string>(generateCssRain(options));

  const [count, setCount] = useState<number>(
    options?.count || defaultOptions.count,
  );
  const [width, setWidth] = useState<number>(
    options?.width || defaultOptions.width,
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
  const [minSpeed, setMinSpeed] = useState<number>(
    options?.minSpeed || defaultOptions.minSpeed,
  );
  const [maxSpeed, setMaxSpeed] = useState<number>(
    options?.maxSpeed || defaultOptions.maxSpeed,
  );
  const [time, setTime] = useState<number>(
    options?.time || defaultOptions.time,
  );
  const [dropWidth, setDropWidth] = useState<number>(
    options?.dropWidth || defaultOptions.dropWidth,
  );
  const [gradientWidth, setGradientWidth] = useState<number>(
    options?.gradientWidth || defaultOptions.gradientWidth,
  );
  const [gradientHeight, setGradientHeight] = useState<number>(
    options?.gradientHeight || defaultOptions.gradientHeight,
  );
  const [color, setColor] = useState<string | string[]>(
    options?.color || defaultOptions.color,
  );

  useEffect(() => {
    setCss(
      generateCssRain({
        className: options?.className || defaultOptions.className,
        count,
        width,
        minHeight,
        maxHeight,
        animDur,
        minSpeed,
        maxSpeed,
        time,
        dropWidth,
        gradientWidth,
        gradientHeight,
        color,
      }),
    );
  }, [
    count,
    width,
    minHeight,
    maxHeight,
    animDur,
    minSpeed,
    maxSpeed,
    time,
    dropWidth,
    gradientWidth,
    gradientHeight,
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
      <details className="bf-bg-dot before:fade-y mx-auto my-4 flex max-w-md flex-col rounded-lg p-4 text-white before:backdrop-blur-lg before:backdrop-brightness-300">
        <summary>Options</summary>
        <label className="flex flex-row justify-between">
          Count:
          <input
            type="number"
            className="rounded-t-lg border-2 bg-transparent p-1 outline-hidden"
            value={count}
            onChange={e => setCount(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Width:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={width}
            onChange={e => setWidth(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Min Height:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={minHeight}
            onChange={e => setMinHeight(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Max Height:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={maxHeight}
            onChange={e => setMaxHeight(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Animation Duration:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={animDur}
            onChange={e => setAnimDur(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Min Speed:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={minSpeed}
            onChange={e => setMinSpeed(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Max Speed:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={maxSpeed}
            onChange={e => setMaxSpeed(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Time:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={time}
            onChange={e => setTime(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Drop Width:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={dropWidth}
            onChange={e => setDropWidth(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Gradient Width:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={gradientWidth}
            onChange={e => setGradientWidth(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Gradient Height:
          <input
            type="number"
            className="border-2 bg-transparent p-1 outline-hidden"
            value={gradientHeight}
            onChange={e => setGradientHeight(parseInt(e.target.value))}
          />
        </label>
        <label className="flex flex-row justify-between">
          Color:
          <input
            type="text"
            className="rounded-b-lg border-2 bg-transparent p-1 outline-hidden"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
        </label>
      </details>
      <details className="bf-bg-dot before:fade-y mx-auto my-4 flex max-w-md flex-col rounded-lg p-4 text-white before:backdrop-blur-lg before:backdrop-brightness-300">
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
          className="absolute top-12 right-8 mt-2 rounded-lg bg-blue-500/90 p-2 text-white"
          onClick={copyToClipboard}
        >
          Copy CSS
        </button>
      </details>
    </>
  );
}
