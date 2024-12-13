import { Tunnel, screenHeight, screenWidth } from './Tunnel';
import './tunnel.css';
import { useEffect, useRef, useState } from 'react';

const sides = 5;
const step = 0.05;
const tunnelRotateSpeed = 3;
const shapeRotateSpeed = 10;
const shapeRotateOffset = 5;

function createTunnel() {
  const tunnel = new Tunnel(sides);
  return tunnel;
}

export default function CameraViewer({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<SVGPathElement[]>([]);
  const [tunnel] = useState<Tunnel>(createTunnel());
  const timeRef = useRef(0);
  const [u, update] = useState(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

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
  }, [u]);

  useEffect(() => {
    let animationFrameId: number;
    const tick = (time: number) => {
      time = time / 10000;
      timeRef.current = time;
      update(u => u + 1);

      tunnel.curve = tunnel.ogCurve.clone();
      tunnel.curve.rotateZ(time * tunnelRotateSpeed);

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
        newPoly.rotateZ(shapeRotateSpeed * time + shapeRotateOffset * t);
        newPoly.rotateToFace(tangent);
        newPoly.move(p);
        tunnel.polygons.push(newPoly);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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
