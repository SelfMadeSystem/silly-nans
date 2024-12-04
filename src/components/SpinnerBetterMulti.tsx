import SpinnerBetterPath, {
  type SpinnerBetterPathProps,
} from './SpinnerBetterPath';
import React from 'react';

type LineCap = 'round' | 'butt' | 'square' | 'inherit';
type LineJoin = 'round' | 'inherit' | 'miter' | 'bevel';

interface SpinnerBetterMultiProps {
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  ds?: [string | SpinnerBetterPathProps][];
  pathLengthMult?: number;
  dashMinLen?: number;
  dashMaxLen?: number;
  duration?: number;
  spinDuration?: number;
  rotationDuration?: number;
  easing?: string;
  linecap?: LineCap;
  linejoin?: LineJoin;
  offset?: number;
}

const SpinnerBetterMulti: React.FC<SpinnerBetterMultiProps> = ({
  className = '',
  size = 64,
  color = 'currentColor',
  strokeWidth = 8,
  ds = [
    `
    M ${size / 2} ${size / 2}
    m 0 -${(size - strokeWidth) / 2}
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 ${
      size - strokeWidth
    }
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 -${
      size - strokeWidth
    }
  `,
  ],
  pathLengthMult = 1,
  dashMinLen = 0,
  dashMaxLen = 0.75,
  duration = 2000,
  spinDuration = 2000,
  rotationDuration = 0,
  easing = 'ease-in-out',
  linecap = 'round',
  linejoin = 'round',
  offset = 0,
}) => {
  const rotationStyle = {
    '--rotation-duration': `${Math.abs(rotationDuration)}ms`,
    '--rotation-direction': rotationDuration > 0 ? 'reverse' : 'normal',
  } as React.CSSProperties;

  const defaults = {
    size,
    color,
    strokeWidth,
    pathLengthMult,
    dashMinLen,
    dashMaxLen,
    duration,
    spinDuration,
    easing,
    linecap,
    linejoin,
    offset,
  };

  return (
    <svg
      className={`spinner-better ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={rotationStyle}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {ds.map((d, index) =>
        typeof d === 'string' ? (
          <SpinnerBetterPath
            key={index}
            d={d}
            color={color}
            strokeWidth={strokeWidth}
            dashMinLen={dashMinLen}
            dashMaxLen={dashMaxLen}
            duration={duration}
            easing={easing}
            linecap={linecap}
            linejoin={linejoin}
            pathLengthMult={pathLengthMult}
            spinDuration={spinDuration}
            offset={offset}
          />
        ) : (
          <SpinnerBetterPath key={index} {...{ ...defaults, ...d }} />
        ),
      )}
    </svg>
  );
};

export default SpinnerBetterMulti;
