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
import { randomId, randomInt } from '../../utils/mathUtils';

type Options = {
  className: string;
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

function createRaindrop(pos: number, { minHeight, maxHeight, minSpeed, maxSpeed, color }: Options): Raindrop {
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
  return Array.from({ length: count }, (_, i) => createRaindrop((i * width) / count, options));
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
    radial-gradient(${dropWidth / 2}px ${dropWidth / 2}px at ${width / 2}px ${height / 2}px, ${color} 100%, #0000 150%)
  `,
    )
    .join(', ');
}

function createRaindropsAnimation(raindrop: Raindrop[], animName: string, { width, dropWidth }: Options): string {
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

  return `
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
    .map(({ height }) => `${width}px ${height}px, ${width}px ${height}px, ${width}px ${height}px`)
    .join(', ');
}

const defaultOptions: Options = {
  className: 'rain-bg',
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

function generateCssRain(count: number, options?: Options): string {
  if (count <= 0) {
    return '';
  }
  options = { ...defaultOptions, ...options };
  const { className, time, animDur } = options;
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

export default generateCssRain;
