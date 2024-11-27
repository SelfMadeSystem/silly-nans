import { mod } from '../utils/mathUtils';
import './SpinnerBetter.css';
import React, { useEffect, useRef, useState } from 'react';

type LineCap = 'round' | 'butt' | 'square' | 'inherit';
type LineJoin = 'round' | 'inherit' | 'miter' | 'bevel';

interface SpinnerProps {
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  variableStrokeWidth?: boolean;
  pathLengthMult?: number;
  dashMinLen?: number;
  dashMaxLen?: number;
  duration?: number;
  spinDuration?: number;
  easing?: string;
  linecap?: LineCap;
  linejoin?: LineJoin;
  offset?: number;
  d?: string;
  noLoad?: boolean;
}

const SpinnerBetter: React.FC<SpinnerProps> = ({
  className = '',
  size = 128,
  color = 'currentColor',
  strokeWidth = 16,
  variableStrokeWidth = false,
  pathLengthMult = 1,
  dashMinLen = 0.001,
  dashMaxLen = 0.751,
  duration = 2000,
  spinDuration = 2000,
  easing = 'ease-in-out',
  linecap = 'round',
  linejoin = 'round',
  offset = 0,
  d = `
    M ${size / 2} ${size / 2}
    m 0 -${(size - strokeWidth) / 2}
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 ${size - strokeWidth}
    a ${(size - strokeWidth) / 2} ${(size - strokeWidth) / 2} 0 1 1 0 -${size - strokeWidth}
`,
  noLoad = false,
}) => {
  const svgPath = useRef<SVGPathElement>(null);
  const svg = useRef<SVGSVGElement>(null);
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
        setDashOffsetAnimationTime(prev => (prev + timeDiff / spinDuration) % 1);
      }
      requestAnimationFrame(animateDashOffset);
    };
    requestAnimationFrame(animateDashOffset);

    if (svg.current) {
      svg.current.style.animationPlayState = 'running';
    }
  }, [offset, pathLength, pathLengthMult, spinDuration]);

  return (
    <svg
      ref={svg}
      className={`spinner-better ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={
        {
          '--easing': easing,
          animationPlayState: noLoad ? 'running' : 'paused',
        } as React.CSSProperties
      }
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        ref={svgPath}
        className="dash"
        pathLength={pathLength}
        style={
          {
            '--path-length': `${multPathLength}px`,
            '--dash-offset': `${multPathLength + dashOffsetLen.current - dashOffsetAnimationTime * multPathLength}px`,
            '--duration': `${duration}ms`,
            '--dash-min-len': dashMinLen,
            '--dash-max-len': dashMaxLen,
            '--dash-diff-len': dashMaxLen - dashMinLen,
          } as React.CSSProperties
        }
        d={d}
        stroke={color}
        strokeWidth={variableStrokeWidth ? 'inherit' : strokeWidth}
        strokeLinecap={linecap}
        strokeLinejoin={linejoin}
        onAnimationIteration={() => {
          dashOffsetLen.current = mod(
            dashOffsetLen.current - ((dashMaxLen - dashMinLen) * multPathLength) / 2,
            multPathLength,
          );
          svgPath.current!.style.setProperty(
            '--dash-offset',
            `${multPathLength + dashOffsetLen.current - dashOffsetAnimationTime * multPathLength}px`,
          );
        }}
      />
    </svg>
  );
};

export default SpinnerBetter;
