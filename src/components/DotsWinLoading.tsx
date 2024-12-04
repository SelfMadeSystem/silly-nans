import './DotsWinLoading.css';
import React from 'react';

// Assuming you have a CSS file for styles

const DotsWinLoading = ({
  size = 64,
  dotSize = 6,
  dotCount = 6,
  spread = 60,
  color = '#fff',
  speed = 1,
  className = '',
}) => {
  return (
    <div
      className={`dots ${className}`}
      style={
        {
          '--size': `${size}px`,
          '--dot-size': `${dotSize}px`,
          '--dot-count': dotCount,
          '--color': color,
          '--speed': `${speed}s`,
          '--spread': `${spread}deg`,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className="dot"
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default DotsWinLoading;
