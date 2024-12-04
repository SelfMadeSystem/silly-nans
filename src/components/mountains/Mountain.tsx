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
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mountains] = useState<MountainArray>(createMountains());
  const [z, setZ] = useState(offset);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) {
      return;
    }
    mountains.camera.position = new Vector3(0, 0, z);

    mountains.draw(ctx);
  }, [z]);

  useEffect(() => {
    let animationFrameId: number;
    let prevTime = 0;

    const render = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - prevTime;
      prevTime = currentTime;
      setZ((z) => (z - offset + deltaTime / 1000 * 10) % depth + offset);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex flex-col">
      <canvas
        ref={canvas}
        className="mountain"
        width={screenWidth}
        height={screenHeight}
      />
    </div>
  );
}
