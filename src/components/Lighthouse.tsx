import { createCanvasEffect } from 'nans-canvas';
import { CanvasEffect } from 'nans-canvas/react';
import { Vector2 } from 'nans-canvas/utils/vec';
import { useEffect, useState } from 'react';
import { Pane } from 'tweakpane';

const characters = ' .-:=+*#%@'.split('');

const defaultSettings = {
  gridSize: 15,
  fromBottom: 5,
  textSize: 1.2,
  drawText: true,
  fireColor: false,
  /** Half-angle of the beam in radians; intensity reaches 0 here. */
  beamAngle: 0.9,
  beamGain: 1.05,
  falloffPower: 1.5,
  /** Higher = beam follows the pointer faster. */
  aimResponse: 20,
  /** Beam length as a fraction of screen height when the pointer is at the beam origin. */
  minRadius: 0.5,
  /** Beam length as a fraction of screen height when the pointer is far away. */
  maxRadius: 1,
  /** Pointer distance (fraction of the larger grid dimension) at which the beam reaches maxRadius. */
  radiusReach: 0.9,
};

type LighthouseSettings = typeof defaultSettings;

const presets: Record<string, Partial<LighthouseSettings>> = {
  Default: {},
  Fire: { fireColor: true, beamAngle: 1.1, beamGain: 1.2, falloffPower: 1.2 },
  Laser: {
    beamAngle: 0.15,
    beamGain: 1.5,
    falloffPower: 1,
    aimResponse: 40,
    minRadius: 0.3,
    maxRadius: 1.6,
    radiusReach: 0.5,
  },
  Floodlight: {
    beamAngle: 2,
    beamGain: 1.3,
    falloffPower: 2.5,
    minRadius: 0.75,
    maxRadius: 2,
    radiusReach: 1,
  },
  Pixels: { drawText: false, gridSize: 8, fireColor: false },
  Chunky: { gridSize: 28, textSize: 1.4, aimResponse: 8 },
};

function calculateIntensity(
  x: number,
  y: number,
  targetAngle: number,
  maxRadius: number,
  { beamAngle, beamGain, falloffPower }: LighthouseSettings,
) {
  const distance = Math.hypot(x, y);
  if (distance > maxRadius) return 0;

  let angleDifference = Math.abs(Math.atan2(y, x) - targetAngle);
  if (angleDifference > Math.PI)
    angleDifference = 2 * Math.PI - angleDifference;
  if (angleDifference >= beamAngle) return 0;

  const angleIntensity = 1 - angleDifference / beamAngle;
  const distanceIntensity = 1 - distance / maxRadius;
  return (angleIntensity * distanceIntensity * beamGain) ** falloffPower;
}

/** Deterministic pseudo-random value in [-1, 1] for an integer lattice point. */
function hash3(x: number, y: number, z: number) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 2147483648 - 1;
}

const fade = (a: number) => a * a * (3 - 2 * a);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const u = fade(x - xi),
    v = fade(y - yi),
    w = fade(z - zi);
  return mix(
    mix(
      mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u),
      mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u),
      v,
    ),
    mix(
      mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u),
      mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u),
      v,
    ),
    w,
  );
}

/** Fractal value noise in roughly [-1, 1]; smooth in time but not wave-like. */
function noiseFunction(x: number, y: number, t: number) {
  return (
    (valueNoise(x * 4, y * 4, t * 0.6) +
      0.5 * valueNoise(x * 8 + 31, y * 8 + 17, t * 1.3)) /
    1.5
  );
}

export const lighthouse = createCanvasEffect(
  { contextId: '2d', globalPointers: true },
  (settings: LighthouseSettings) => {
    // Last known pointer position; kept after touch pointers lift
    let pointer: Vector2 | null = null;
    // Eased position the beam actually points at
    let aim: Vector2 | null = null;

    return {
      draw({ ctx, elapsedTime, deltaTime }) {
        const { width: cw, height: ch } = ctx.canvas;
        const {
          fromBottom,
          textSize,
          drawText,
          fireColor,
          aimResponse,
          minRadius,
          maxRadius,
          radiusReach,
        } = settings;
        const gridSize = settings.gridSize * (window.devicePixelRatio || 1);
        const fromBottomPixels = fromBottom * gridSize;
        const center = new Vector2(cw / 2, ch - fromBottomPixels);

        ctx.clearRect(0, 0, cw, ch);

        // Sweep slowly until the user moves a pointer
        const target =
          pointer ??
          new Vector2(
            cw / 2 + Math.sin(elapsedTime * 0.5) * cw * 0.3,
            ch * 0.3,
          );
        aim = aim
          ? aim.lerp(target, 1 - Math.exp(-aimResponse * deltaTime))
          : target;

        const mouse = new Vector2(aim.x - center.x, center.y - aim.y).div(
          gridSize,
        );
        const mouseAngle = mouse.angle();

        const width = Math.floor(cw / gridSize);
        const height = Math.floor(ch / gridSize);
        // Original clock was in ms
        const t = elapsedTime * 1000 * 0.005;

        if (drawText) {
          ctx.font = `${gridSize * textSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
        }

        const effectRadius =
          height *
          (minRadius +
            (maxRadius - minRadius) *
              Math.min(
                mouse.length() / (radiusReach * Math.max(width, height)),
                1,
              ));

        for (let x = -Math.floor(width / 2); x <= Math.ceil(width / 2); x++) {
          for (let y = -fromBottom; y <= height - fromBottom; y++) {
            const base = calculateIntensity(
              x,
              y,
              mouseAngle,
              effectRadius,
              settings,
            );
            if (base === 0) continue;
            const intensity =
              base * (0.1 * noiseFunction(0.2 * x, 0.2 * y, t) + 0.95);

            if (fireColor) {
              const i = Math.min(1, Math.max(0, intensity));
              const g = Math.floor(255 * Math.min(1, i * 1.25));
              const b = Math.floor(255 * Math.max(0, (i - 0.6) * 2.5));
              ctx.fillStyle = `rgba(255, ${g}, ${b}, ${Math.min(1, i * 1.2)})`;
            } else {
              ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            }

            const px = cw / 2 + x * gridSize;
            const py = ch - (y + fromBottom) * gridSize;

            if (!drawText) {
              ctx.fillRect(
                px - gridSize / 2,
                py - gridSize / 2,
                gridSize,
                gridSize,
              );
              continue;
            }

            const charIndex = Math.min(
              characters.length - 1,
              Math.floor(intensity * characters.length),
            );
            ctx.fillText(characters[charIndex]!, px, py);
          }
        }
      },
      onPointerMove({ position }) {
        pointer = position.pixels;
      },
      onPointerDown({ position }) {
        pointer = position.pixels;
      },
      cleanup() {
        pointer = null;
        aim = null;
      },
    };
  },
);

export default function Lighthouse(
  props: React.HTMLAttributes<HTMLCanvasElement>,
) {
  const [settings] = useState<LighthouseSettings>(() => ({
    ...defaultSettings,
  }));

  useEffect(() => {
    const pane = new Pane({ title: 'Lighthouse', expanded: false });

    const beam = pane.addFolder({ title: 'Beam' });
    beam.addBinding(settings, 'beamAngle', {
      label: 'Beam Angle',
      min: 0.1,
      max: Math.PI,
      step: 0.01,
    });
    beam.addBinding(settings, 'beamGain', {
      label: 'Beam Gain',
      min: 0.5,
      max: 2,
      step: 0.01,
    });
    beam.addBinding(settings, 'falloffPower', {
      label: 'Falloff Power',
      min: 0.5,
      max: 4,
      step: 0.01,
    });
    beam.addBinding(settings, 'aimResponse', {
      label: 'Aim Response',
      min: 1,
      max: 60,
      step: 1,
    });
    beam.addBinding(settings, 'minRadius', {
      label: 'Min Radius',
      min: 0.1,
      max: 2,
      step: 0.01,
    });
    beam.addBinding(settings, 'maxRadius', {
      label: 'Max Radius',
      min: 0.1,
      max: 3,
      step: 0.01,
    });
    beam.addBinding(settings, 'radiusReach', {
      label: 'Radius Reach',
      min: 0.1,
      max: 2,
      step: 0.01,
    });

    const look = pane.addFolder({ title: 'Appearance' });
    look.addBinding(settings, 'gridSize', {
      label: 'Grid Size',
      min: 4,
      max: 40,
      step: 1,
    });
    look.addBinding(settings, 'fromBottom', {
      label: 'From Bottom',
      min: 0,
      max: 15,
      step: 1,
    });
    look.addBinding(settings, 'drawText', { label: 'Draw Text' });
    look.addBinding(settings, 'textSize', {
      label: 'Text Size',
      min: 0.5,
      max: 2,
      step: 0.01,
    });
    look.addBinding(settings, 'fireColor', { label: 'Fire Color' });

    const presetFolder = pane.addFolder({ title: 'Presets', expanded: false });
    for (const [name, preset] of Object.entries(presets)) {
      presetFolder.addButton({ title: name }).on('click', () => {
        Object.assign(settings, defaultSettings, preset);
        pane.refresh();
      });
    }

    return () => pane.dispose();
  }, [settings]);

  return <CanvasEffect effect={lighthouse} options={settings} {...props} />;
}
