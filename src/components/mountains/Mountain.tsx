import './mountain.css';
import { MountainArray, depth, screenHeight, screenWidth } from './mountains';
import { Vector3 } from './vec';
import { useEffect, useRef, useState } from 'react';

function createMountains() {
  const mountainArray = new MountainArray();
  mountainArray.generate();
  return mountainArray;
}

const offset = 10;

export default function Mountain() {
  const svgRef = useRef<SVGSVGElement>(null);
  const polygonRefs = useRef<SVGPolygonElement[]>([]);
  // const canvas = useRef<HTMLCanvasElement>(null);
  const [mountains] = useState<MountainArray>(createMountains());
  const [z, setZ] = useState(offset);

  useEffect(() => {
    // const ctx = canvas.current?.getContext('2d');
    // if (!ctx) {
    //   return;
    // }
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    mountains.camera.position = new Vector3(0, 0, z);

    const polys = mountains.toPolyPoints();
    const svgPolys = polygonRefs.current;

    for (let i = 0; i < Math.min(polys.length, svgPolys.length); i++) {
      const poly = polys[i];
      const svgPoly = svgPolys[i];
      svgPoly.setAttribute('points', poly);
    }

    if (svgPolys.length < polys.length) {
      for (let i = svgPolys.length; i < polys.length; i++) {
        const svgPoly = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'polygon',
        );
        svgPoly.classList.add('mountain-bg');
        svgPoly.setAttribute('points', polys[i]);
        svgPolys.push(svgPoly);
        svg.appendChild(svgPoly);
      }
    }

    // mountains.draw(ctx);
  }, [z]);

  useEffect(() => {
    let animationFrameId: number;
    let prevTime = 0;
    const render = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - prevTime;
      prevTime = currentTime;
      setZ(z => ((z - offset + (deltaTime / 1000) * 10) % depth) + offset);
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex flex-col w-full items-center">
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
