import { clamp, lerp } from '../utils/mathUtils';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  curved: true,
  rows: 15,
  cols: 20,
  size: 50,
  lineSize: 0.8,
  strokeColor: '#ffffff',
  minStrokeWidth: 1,
  maxStrokeWidth: 8,
  strokeMouseDistance: 300,
  linecap: 'butt' as 'butt' | 'round',
};

type Options = typeof defaultOptions;

function CurvedMouseLine({
  pos: iPos,
  mousePos,
  options,
}: {
  pos: Vector2;
  mousePos: Vector2;
  options: Options;
}) {
  const {
    lineSize,
    size,
    curved,
    strokeColor,
    minStrokeWidth,
    maxStrokeWidth,
    strokeMouseDistance,
    linecap,
  } = options;
  const pos = iPos.mult(size);
  const distance = pos.dist(mousePos);
  const angled = Vector2.fromAngle(
    Math.atan2(mousePos.y - pos.y, mousePos.x - pos.x) + Math.PI / 2,
  );
  const mag = Math.min((lineSize * size) / 2, curved ? distance / 2 : Infinity);
  const offset = angled.setMag(mag);
  const start = pos.sub(offset);
  const end = pos.add(offset);

  const r = distance;

  const path = curved
    ? `M ${start.x} ${start.y} A ${r} ${r} 0 0 0 ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  return (
    <path
      d={path}
      stroke={strokeColor}
      fill="none"
      strokeLinecap={linecap}
      strokeWidth={lerp(
        maxStrokeWidth,
        minStrokeWidth,
        clamp((distance / strokeMouseDistance) * 2 - 1, 0, 1),
      )}
    />
  );
}

function makesPoses(options: Options): Vector2[] {
  const { rows, cols } = options;
  const positions: Vector2[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      positions.push(new Vector2(j + 0.5, i + 0.5));
    }
  }
  return positions;
}

function CurvedMouseLines({ options }: { options: Options }) {
  const { rows, cols, size } = options;

  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState<Vector2>(new Vector2(0, 0));
  const [positions, setPositions] = useState<Vector2[]>(() =>
    makesPoses(options),
  );

  const width = cols * size;
  const height = rows * size;

  useEffect(() => {
    const newPositions = makesPoses(options);
    setPositions(newPositions);
  }, [options, rows, cols]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePos(new Vector2(x, y));
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <svg
      className="mx-auto"
      width={width}
      height={height}
      overflow="visible"
      ref={svgRef}
    >
      {positions.map((pos, index) => (
        <CurvedMouseLine
          key={index}
          pos={pos}
          mousePos={mousePos}
          options={options}
        />
      ))}
    </svg>
  );
}

export default function CurvedMouseLinesWrapper() {
  const [options] = useState<Options>({ ...defaultOptions });

  useEffect(() => {
    const pane = new Pane();

    const folder = pane.addFolder({
      title: 'Options',
      expanded: true,
    });

    folder.addBinding(options, 'curved', {
      label: 'Curved',
    });
    folder.addBinding(options, 'rows', {
      label: 'Rows',
      min: 1,
      max: 50,
      step: 1,
    });
    folder.addBinding(options, 'cols', {
      label: 'Cols',
      min: 1,
      max: 50,
      step: 1,
    });
    folder.addBinding(options, 'size', {
      label: 'Size',
      min: 1,
      max: 200,
      step: 1,
    });
    folder.addBinding(options, 'lineSize', {
      label: 'Line Size',
      min: 0,
      max: 1,
      step: 0.01,
    });
    folder.addBinding(options, 'strokeColor', {
      label: 'Line Color',
    });
    folder.addBinding(options, 'minStrokeWidth', {
      label: 'Min Stroke Width',
      min: 0.1,
      max: 10,
      step: 0.1,
    });
    folder.addBinding(options, 'maxStrokeWidth', {
      label: 'Max Stroke Width',
      min: 0.1,
      max: 20,
      step: 0.1,
    });
    folder.addBinding(options, 'strokeMouseDistance', {
      label: 'Stroke Mouse Distance',
      min: 0,
      max: 1000,
      step: 1,
    });
    folder.addBinding(options, 'linecap', {
      label: 'Line Cap',
      options: {
        Butt: 'butt',
        Round: 'round',
      },
    });

    const presets = pane.addFolder({
      title: 'Presets',
      expanded: false,
    });
    presets
      .addButton({
        title: 'Default',
      })
      .on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
    presets
      .addButton({
        title: 'Inverted Width',
      })
      .on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          maxStrokeWidth: defaultOptions.minStrokeWidth,
          minStrokeWidth: defaultOptions.maxStrokeWidth,
        });
        pane.refresh();
      });

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <CurvedMouseLines options={options} />;
}
