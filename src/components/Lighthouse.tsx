import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const characters = ' .-:=+*#%@'.split('');

function calculateIntensity(
  pos: Vector2,
  targetAngle: number,
  maxRadius: number,
) {
  let angleDifference = Math.abs(pos.angle() - targetAngle);

  if (angleDifference > Math.PI) {
    angleDifference = 2 * Math.PI - angleDifference;
  }

  const distance = pos.length();

  if (distance > maxRadius || angleDifference > 0.7) {
    return 0;
  }

  const angleIntensity = Math.max(0, 1 - angleDifference / 0.9);
  const distanceIntensity = Math.max(0, 1 - distance / maxRadius);

  return (angleIntensity * distanceIntensity * 1.05) ** 1.5;
}

function getIntensity(
  mouse: Vector2,
  pos: Vector2,
  width: number,
  height: number,
): number {
  const targetAngle = mouse.angle();

  const effectRadius =
    height *
    (0.5 + 0.5 * Math.min(mouse.length() / (0.9 * Math.max(width, height)), 1));

  return calculateIntensity(pos, targetAngle, effectRadius);
}

/**
 * A noise function that varies smoothly over time.
 */
function noiseFunction(x: number, y: number, t: number) {
  return (
    (Math.sin(x + t) +
      Math.sin(1.5 * y + 0.8 * t) +
      Math.sin(2.5 * (x + y) + 1.2 * t)) /
    3
  );
}

const defaultOptions = {
  gridSize: 15,
  fromBottom: 5,
  textSize: 1.2,
  drawText: true,
  fireColor: false,
};

type LighthouseOptions = typeof defaultOptions;

function Lighthouse({ options }: { options: LighthouseOptions }) {
  const [ctx, canvas, setCanvas] = useCanvas({
    autoResize: true,
  });
  const mouseRef = useRef<Vector2 | null>(null);

  useAnimationLoop((_dt, t) => {
    if (!ctx || !canvas) return;

    const { gridSize, fromBottom, textSize, drawText, fireColor } = options;

    const fromBottomPixels = fromBottom * gridSize;

    const center = new Vector2(
      canvas.width / 2,
      canvas.height - fromBottomPixels,
    );

    const getMousePos = (): Vector2 => {
      if (!mouseRef.current) return new Vector2(0, fromBottomPixels);
      return center.sub(mouseRef.current).mult(-1, 1);
    };

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mouse = getMousePos().div(gridSize);

    const width = Math.floor(canvas.width / gridSize);
    const height = Math.floor(canvas.height / gridSize);

    for (let x = -Math.floor(width / 2); x <= Math.ceil(width / 2); x++) {
      for (let y = -fromBottom; y <= height; y++) {
        const baseIntensity = getIntensity(
          mouse,
          new Vector2(x, y),
          width,
          height,
        );

        const animatedIntensity =
          baseIntensity *
          (0.1 * noiseFunction(0.2 * x, 0.2 * y, t * 0.005) + 0.95);

        let color: string;

        if (fireColor) {
          // Create smooth fire gradient: red -> orange -> yellow -> white
          const intensity = Math.min(1, Math.max(0, animatedIntensity));

          // Define color stops for fire gradient
          const r = 255;
          const g = Math.floor(255 * Math.min(1, intensity * 1.25)); // Ramp up green quickly
          const b = Math.floor(255 * Math.max(0, (intensity - 0.6) * 2.5)); // Add blue for white at high intensity
          const alpha = Math.min(1, intensity * 1.2); // Fade in with intensity

          color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
          color = `rgba(255, 255, 255, ${animatedIntensity})`;
        }
        ctx.fillStyle = color;

        if (!drawText) {
          ctx.fillRect(
            canvas.width / 2 + x * gridSize - gridSize / 2,
            canvas.height - (y + fromBottom) * gridSize - gridSize / 2,
            gridSize,
            gridSize,
          );
          continue;
        }

        // Draw character
        const charIndex = Math.min(
          characters.length - 1,
          Math.floor(animatedIntensity * characters.length),
        );
        const char = characters[charIndex];

        ctx.font = `${gridSize * textSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          char,
          canvas.width / 2 + x * gridSize,
          canvas.height - (y + fromBottom) * gridSize,
        );
      }
    }
  });

  useWindowEvent('mousemove', e => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    mouseRef.current = mouse;
  });

  useWindowEvent('touchmove', e => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mouse = new Vector2(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
    );
    mouseRef.current = mouse;
  });

  return (
    <canvas className="fixed inset-0 -z-10 h-full w-full" ref={setCanvas} />
  );
}

export default function LighthouseWrapper() {
  const [options] = useState<LighthouseOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const optionsFolder = pane.addFolder({
        title: 'Options',
        expanded: true,
      });
      optionsFolder.addBinding(options, 'gridSize', {
        min: 5,
        max: 50,
        step: 1,
      });
      optionsFolder.addBinding(options, 'fromBottom', {
        min: 0,
        max: 20,
        step: 1,
      });
      optionsFolder.addBinding(options, 'textSize', {
        min: 0.1,
        max: 3,
        step: 0.1,
      });
      optionsFolder.addBinding(options, 'drawText');
      optionsFolder.addBinding(options, 'fireColor');
    }

    {
      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });
      presetsFolder.addButton({ title: 'Default' }).on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'No Text' }).on('click', () => {
        Object.assign(options, { ...defaultOptions, drawText: false });
        pane.refresh();
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <Lighthouse options={options} />;
}
