import React from 'react';
import './SpinnerBetter.css';

interface SpinnerBetterContainerProps {
  className?: string;
  size?: number;
  rotationDuration?: number;
}

const SpinnerBetterContainer: React.FC<
  React.PropsWithChildren<SpinnerBetterContainerProps>
> = ({ className = '', size = 64, rotationDuration = 0, children }) => {
  const rotationStyle = {
    '--rotation-duration': `${Math.abs(rotationDuration)}ms`,
    '--rotation-direction': rotationDuration > 0 ? 'reverse' : 'normal',
  } as React.CSSProperties;

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
      {children}
    </svg>
  );
};

export default SpinnerBetterContainer;
