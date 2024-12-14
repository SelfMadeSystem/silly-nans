import { Polygon, Tunnel, screenHeight, screenWidth } from './Tunnel';
import './tunnel.css';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const initialConfig = {
  sides: 6,
  step: 0.05,
  curvature: 1,
  tunnelRotateSpeed: 3,
  shapeRotateSpeed: 10,
  shapeRotateOffset: 5,
};

function createTunnel(sides: number) {
  const tunnel = new Tunnel(sides);
  return tunnel;
}

export default function TunnelView({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<SVGPathElement[]>([]);
  const [config] = useState(initialConfig);
  const [tunnel] = useState<Tunnel>(createTunnel(config.sides));
  const timeRef = useRef(0);
  const [u, update] = useState(0);

  useEffect(() => {
    const pane = new Pane();
    pane
      .addBinding(config, 'sides', { min: 3, max: 20, step: 1 })
      .on('change', () => {
        tunnel.ogPoly = new Polygon(config.sides, 1);
        tunnel.polygons = [];
      });
    pane.addBinding(
      {
        step: -Math.log10(config.step),
      },
      'step',
      { max: -Math.log10(0.01), min: -Math.log10(0.15), step: 0.01 },
    ).on('change', (e) => {
      config.step = Math.pow(10, -e.value);
    });
    pane.addBinding(config, 'curvature', {
      min: 0,
      max: 2,
      step: 0.1,
    });
    pane.addBinding(config, 'tunnelRotateSpeed', {
      min: -10,
      max: 10,
      step: 0.1,
    });
    pane.addBinding(config, 'shapeRotateSpeed', {
      min: -20,
      max: 20,
      step: 0.1,
    });
    pane.addBinding(config, 'shapeRotateOffset', {
      min: -10,
      max: 10,
      step: 0.1,
    });

    return () => pane.dispose();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const { step } = config;

    const time = timeRef.current;
    const s = time % step;

    svgRef.current.style.setProperty('--t', `${time}`);

    const polys = [...tunnel.getPolygonPath()];
    const svgPolys = pathRefs.current;

    const outside = 1000;
    const fillEntireThingPath = `M -${outside} -${outside} L ${screenWidth + outside} -${outside} L ${screenWidth + outside} ${screenHeight + outside} L -${outside} ${screenHeight + outside} Z`;

    for (let i = 0; i < Math.min(polys.length, svgPolys.length); i++) {
      const poly = polys[i];
      if (!poly) {
        continue;
      }
      const svgPoly = svgPolys[i];
      svgPoly.setAttribute('d', fillEntireThingPath + poly);
      svgPoly.style.setProperty('--n', `${i + s / step}`);
      svgPoly.style.setProperty('display', 'block');
    }

    for (let i = polys.length; i < svgPolys.length; i++) {
      svgPolys[i].style.setProperty('display', 'none');
    }

    if (svgPolys.length < polys.length) {
      for (let i = svgPolys.length; i < polys.length; i++) {
        const svgPoly = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        );
        svgPoly.classList.add('tunnel-path');
        svgPoly.setAttribute('d', polys[i]);
        svgPolys.push(svgPoly);
        svg.appendChild(svgPoly);
      }
    }
  }, [u, config, tunnel]);

  useEffect(() => {
    let animationFrameId: number;
    const tick = (time: number) => {
      const {
        tunnelRotateSpeed,
        sides,
        curvature,
        shapeRotateSpeed,
        shapeRotateOffset,
        step,
      } = config;
      time = time / 10000;
      timeRef.current = time;
      update(u => u + 1);

      tunnel.curve = tunnel.ogCurve.clone();
      tunnel.curve.rotateZ(time * tunnelRotateSpeed);
      tunnel.curve.scale(curvature);

      const s = time % step;

      const curve = tunnel.curve;
      const poly = tunnel.ogPoly;
      tunnel.polygons = [];

      const startT = s - step;
      const endT = startT + 1 + step;

      for (let t = startT; t <= endT; t += step) {
        const tangent = curve.getTangent(t);
        const p = curve.getPoint(t);
        const newPoly = poly.clone();
        newPoly.rotateZ(
          shapeRotateSpeed * time +
            ((shapeRotateOffset * Math.PI * 2) / sides) * t,
        );
        newPoly.rotateToFace(tangent);
        newPoly.move(p);
        tunnel.polygons.push(newPoly);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick(u);
    return () => cancelAnimationFrame(animationFrameId);
  }, [config]);

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <svg
        ref={svgRef}
        width={screenWidth}
        height={screenHeight}
        className="svg tunnel overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      ></svg>
    </div>
  );
}
