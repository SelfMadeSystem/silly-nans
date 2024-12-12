import { Tunnel, screenHeight, screenWidth } from './Tunnel';
import './tunnel.css';
import { Vector3 } from './vec';
import { useEffect, useRef, useState } from 'react';

function createTunnel() {
  const tunnel = new Tunnel(8);
  return tunnel;
}

export default function CameraViewer({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<SVGPathElement[]>([]);
  // const canvas = useRef<HTMLCanvasElement>(null);
  const [tunnel] = useState<Tunnel>(createTunnel());
  const [z, setZ] = useState(0);

  useEffect(() => {
    // const ctx = canvas.current?.getContext('2d');
    // if (!ctx) {
    //   return;
    // }
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

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

    // mountains.draw(ctx);
  }, [z]);

  useEffect(() => {
    const interval = setInterval(() => {
      setZ(z => z + 1);

      const curve = tunnel.curve;
      const poly = tunnel.ogPoly;
      tunnel.polygons = [];

      const step = 0.05;
      const startT = -((z / 500) % step)-0.5;
      const endT = startT + 2;

      for (let t = startT; t < endT; t += step) {
        const tangent = curve.getTangent(t);
        const p = curve.getPoint(t);
        const newPoly = poly.clone();
        newPoly.rotateZ(t * Math.PI * 2);
        newPoly.rotateToFace(tangent);
        newPoly.move(p);
        tunnel.polygons.push(newPoly);
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  });

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <svg
        ref={svgRef}
        width={screenWidth}
        height={screenHeight}
        className="svg mountain overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      ></svg>
      {/* <canvas
        ref={canvas}
        className="mountain"
        width={screenWidth}
        height={screenHeight}
      /> */}
    </div>
  );
}
