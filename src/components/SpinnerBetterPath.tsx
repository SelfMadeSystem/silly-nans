import React, { useEffect, useRef, useState } from 'react';
import { mod } from '../utils/mathUtils';

type LineCap = 'round' | 'butt' | 'square' | 'inherit';
type LineJoin = 'round' | 'inherit' | 'miter' | 'bevel';

export interface SpinnerBetterPathProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  d?: string;
  pathLengthMult?: number;
  dashMinLen?: number;
  dashMaxLen?: number;
  duration?: number;
  spinDuration?: number;
  easing?: string;
  linecap?: LineCap;
  linejoin?: LineJoin;
  offset?: number;
}

const SpinnerBetterPath: React.FC<SpinnerBetterPathProps> = ({
  size = 64,
  color = 'currentColor',
  strokeWidth = 8,
  d = `
    M ${size / 2} ${size / 2}
    m 0 -${(size - strokeWidth) / 2}
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 ${
    size - strokeWidth
  }
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 -${
    size - strokeWidth
  }
  `,
  pathLengthMult = 1,
  dashMinLen = 0,
  dashMaxLen = 0.75,
  duration = 2000,
  spinDuration = 2000,
  easing = 'ease-in-out',
  linecap = 'round',
  linejoin = 'round',
  offset = 0,
}) => {
  const svgPathRef = useRef<SVGPathElement>(null);
  const [dashOffsetAnimationTime, setDashOffsetAnimationTime] = useState(0);
  const pathLength = 300;
  const multPathLength = pathLength * pathLengthMult;
  const dashOffsetLen = useRef(mod(offset * multPathLength, multPathLength));

  useEffect(() => {
    let prevDate = Date.now();

    const animateDashOffset = () => {
      let date = Date.now();
      let timeDiff = date - prevDate;
      prevDate = date;
      if (spinDuration > 0) {
        setDashOffsetAnimationTime(
          prev => (prev + timeDiff / spinDuration) % 1,
        );
      }
      requestAnimationFrame(animateDashOffset);
    };
    requestAnimationFrame(animateDashOffset);

    if (svgPathRef.current) {
      svgPathRef.current.style.animationPlayState = 'running';
    }
  }, [offset, pathLength, pathLengthMult, spinDuration]);

  const handleAnimationIteration = () => {
    dashOffsetLen.current = mod(
      dashOffsetLen.current -
        ((dashMaxLen - dashMinLen) * multPathLength) / 2,
      multPathLength,
    );
    svgPathRef.current!.style.setProperty(
      '--dash-offset',
      `${multPathLength + dashOffsetLen.current - dashOffsetAnimationTime * multPathLength}px`,
    );
  };

  const pathStyle = {
    '--path-length': `${multPathLength}px`,
    '--dash-offset': `${multPathLength + dashOffsetLen.current - dashOffsetAnimationTime * multPathLength}px`,
    '--easing': easing,
    '--duration': `${duration}ms`,
    '--dash-min-len': dashMinLen,
    '--dash-max-len': dashMaxLen,
    '--dash-diff-len': dashMaxLen - dashMinLen,
  } as React.CSSProperties;

  return (
    <path
      ref={svgPathRef}
      className="dash"
      style={pathStyle}
      d={d}
      pathLength={pathLength}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap={linecap}
      strokeLinejoin={linejoin}
      onAnimationIteration={handleAnimationIteration}
    />
  );
};

export default SpinnerBetterPath;