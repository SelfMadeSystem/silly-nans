import React from 'react';
import './Michaelsoft.css'; // Assuming you have a CSS file for styles

const Michaelsoft = ({ _class = "", bg = '#fff', size = 64, gap = 2 }) => {
  return (
    <div
      className={`michaelsofts ${_class}`}
      style={{
        '--color-bg': bg,
        '--size': `${size}px`,
        '--gap': `${gap}px`,
        '--raw-size': size,
        '--raw-gap': gap
      } as React.CSSProperties}
    >
      <div className="michaelsoft a" />
      <div className="michaelsoft b" />
      <div className="michaelsoft c" />
      <div className="michaelsoft d" />
    </div>
  );
};

export default Michaelsoft;