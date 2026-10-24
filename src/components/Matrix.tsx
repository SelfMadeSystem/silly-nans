/**
 * Matrix effect within a canvas element.
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
import { createCanvasEffect } from 'nans-canvas';
import { CanvasEffect } from 'nans-canvas/react';
import {
  clamp,
  floorMultiple,
  mod,
  randomInt,
  randomLog,
} from 'nans-canvas/utils/mathUtils';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

/**
 * A column in the matrix.
 *
 * @property pos The position of the column
 * @property speed The speed of the column
 * @property chars The character of the column
 * @property randomTextIndex The index of the random text. -1 if not part of the random text
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export type MatrixColumn = {
  pos: number;
  speed: number;
  chars: string[];
};

export type MatrixProps = {
  trailColor?: string;
  dropColor?: string;
  charOpacity?: number;
  speed?: [number, number];
  fontSize?: number;
  className?: string;
  columns?: number;
  rows?: number;
};

type MatrixSettings = Required<Omit<MatrixProps, 'className'>>;

const getSettings = (options: MatrixProps = {}): MatrixSettings => {
  const trailColor = options.trailColor ?? '#0F0';

  return {
    trailColor,
    dropColor: options.dropColor ?? trailColor,
    charOpacity: options.charOpacity ?? 0.1,
    speed: options.speed
      ? ([...options.speed] as [number, number])
      : [0.1, 0.3],
    fontSize: options.fontSize ?? 14,
    columns: options.columns ?? 50,
    rows: options.rows ?? 30,
  };
};

const chars =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()+-=[]{};:',.<>?/".split(
    '',
  );

const randChar = () => chars[randomInt(0, chars.length - 1)];

const matrixEffect = createCanvasEffect(
  { contextId: '2d', scrollable: true },
  (settings: MatrixSettings) => {
    const { fontSize, columns, rows } = settings;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const randSpeed = () => randomLog(...settings.speed);

    const columnsArray: MatrixColumn[] = Array.from(
      { length: columns },
      () => ({
        pos: randomInt(0, rows),
        speed: randSpeed(),
        chars: Array.from({ length: rows }, randChar),
      }),
    );
    let activeSpeed = settings.speed;

    const tile = document.createElement('canvas');
    const tileCtx = tile.getContext('2d')!;
    let pixelRatio = 1;
    let cssWidth = 0;
    let cssHeight = 0;

    const resetColumn = (col: MatrixColumn) => {
      col.chars[0] = randChar();
      col.pos = 0;
      col.speed = randSpeed();
    };

    const drawTile = () => {
      tileCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      tileCtx.clearRect(0, 0, columns * fontSize, rows * fontSize);
      tileCtx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const { pos, chars } = columnsArray[i];
        const fPos = Math.floor(pos);

        for (let j = 0; j < Math.min(chars.length, rows); j++) {
          tileCtx.globalAlpha = clamp(
            1 - mod(fPos - j, rows) * settings.charOpacity,
            0,
            1,
          );
          tileCtx.fillStyle =
            j === fPos ? settings.dropColor : settings.trailColor;
          tileCtx.fillText(chars[j], i * fontSize, (j + 1) * fontSize);
        }
      }
    };

    const step = () => {
      if (activeSpeed !== settings.speed) {
        for (const col of columnsArray) col.speed = randSpeed();
        activeSpeed = settings.speed;
      }

      for (const col of columnsArray) {
        const { pos, speed, chars } = col;

        // Change the character when the position goes to the next integer.
        if (pos + speed < rows && Math.floor(pos + speed) > pos) {
          chars[Math.floor(pos + speed)] = randChar();
        }

        col.pos += speed;

        if (pos > rows) resetColumn(col);
      }
    };

    if (prefersReducedMotion) {
      for (let i = 0; i < rows; i++) step();
    }

    return {
      onResize(size) {
        pixelRatio = size.pixelRatio;
        cssWidth = size.cssWidth;
        cssHeight = size.cssHeight;
        tile.width = Math.round(columns * fontSize * pixelRatio);
        tile.height = Math.round(rows * fontSize * pixelRatio);
        drawTile();
      },
      draw({ ctx, scroll }) {
        if (!prefersReducedMotion) {
          step();
        }
        drawTile();

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        const tileWidth = columns * fontSize;
        const tileHeight = rows * fontSize;
        const floorScroll = floorMultiple(scroll.pixels.y, tileHeight);
        for (let x = 0; x < cssWidth; x += tileWidth) {
          for (
            let y = floorScroll;
            y < cssHeight + floorScroll;
            y += tileHeight
          ) {
            ctx.drawImage(tile, x, y - scroll.pixels.y, tileWidth, tileHeight);
          }
        }
      },
    };
  },
);

/**
 * The Matrix component.
 *
 * Draws a fancy matrix
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
const Matrix = ({
  options,
  ...props
}: { options?: MatrixProps } & React.HTMLAttributes<HTMLCanvasElement>) => {
  const [defaultSettings] = useState(() => getSettings(options));
  const [settings] = useState(() => ({
    ...defaultSettings,
    speed: [...defaultSettings.speed] as [number, number],
  }));
  const [layoutVersion, setLayoutVersion] = useState(0);
  const paneRef = useRef<Pane | null>(null);

  useEffect(() => {
    const pane = new Pane({ title: 'Matrix', expanded: false });
    paneRef.current = pane;

    const appearance = pane.addFolder({ title: 'Appearance' });
    appearance.addBinding(settings, 'trailColor', {
      label: 'Trail Color',
      view: 'color',
    });
    appearance.addBinding(settings, 'dropColor', {
      label: 'Drop Color',
      view: 'color',
    });
    appearance.addBinding(settings, 'charOpacity', {
      label: 'Character Opacity',
      min: 0,
      max: 1,
      step: 0.01,
    });

    const motion = pane.addFolder({ title: 'Motion' });
    const speedRange = {
      min: settings.speed[0],
      max: settings.speed[1],
    };
    const updateSpeed = () => {
      settings.speed = [
        Math.min(speedRange.min, speedRange.max),
        Math.max(speedRange.min, speedRange.max),
      ];
      speedRange.min = settings.speed[0];
      speedRange.max = settings.speed[1];
      pane.refresh();
    };
    motion
      .addBinding(speedRange, 'min', {
        label: 'Minimum Speed',
        min: 0.01,
        max: 2,
        step: 0.01,
      })
      .on('change', updateSpeed);
    motion
      .addBinding(speedRange, 'max', {
        label: 'Maximum Speed',
        min: 0.01,
        max: 2,
        step: 0.01,
      })
      .on('change', updateSpeed);

    const layout = pane.addFolder({ title: 'Layout' });
    const restartEffect = () => setLayoutVersion(version => version + 1);
    layout
      .addBinding(settings, 'fontSize', {
        min: 6,
        max: 32,
        step: 1,
      })
      .on('change', restartEffect);
    layout
      .addBinding(settings, 'columns', {
        min: 5,
        max: 120,
        step: 1,
      })
      .on('change', restartEffect);
    layout
      .addBinding(settings, 'rows', {
        min: 5,
        max: 60,
        step: 1,
      })
      .on('change', restartEffect);

    const applyPreset = (preset: Partial<MatrixSettings>) => {
      const nextSettings = {
        ...settings,
        ...preset,
        speed: preset.speed
          ? ([...preset.speed] as [number, number])
          : ([...settings.speed] as [number, number]),
      };
      const layoutChanged =
        settings.fontSize !== nextSettings.fontSize ||
        settings.columns !== nextSettings.columns ||
        settings.rows !== nextSettings.rows;

      Object.assign(settings, nextSettings);
      speedRange.min = settings.speed[0];
      speedRange.max = settings.speed[1];
      pane.refresh();

      if (layoutChanged) restartEffect();
    };

    const presets = pane.addFolder({ title: 'Presets', expanded: false });
    presets.addButton({ title: 'Default' }).on('click', () => {
      applyPreset(defaultSettings);
    });
    presets.addButton({ title: 'Dense' }).on('click', () => {
      applyPreset({
        trailColor: '#00d95f',
        dropColor: '#b7ffcf',
        charOpacity: 0.08,
        speed: [0.08, 0.25],
        fontSize: 10,
        columns: 80,
        rows: 45,
      });
    });
    presets.addButton({ title: 'Fast' }).on('click', () => {
      applyPreset({
        trailColor: '#00ff00',
        dropColor: '#c8ffd8',
        charOpacity: 0.06,
        speed: [0.25, 0.8],
        fontSize: 12,
        columns: 65,
        rows: 36,
      });
    });
    presets.addButton({ title: 'Cyan' }).on('click', () => {
      applyPreset({
        trailColor: '#00d9ff',
        dropColor: '#d8fbff',
        charOpacity: 0.1,
        speed: [0.08, 0.24],
      });
    });

    return () => {
      paneRef.current = null;
      pane.dispose();
    };
  }, [defaultSettings, settings]);

  useEffect(() => {
    if (!options) return;

    const nextSettings = getSettings(options);
    const layoutChanged =
      settings.fontSize !== nextSettings.fontSize ||
      settings.columns !== nextSettings.columns ||
      settings.rows !== nextSettings.rows;

    Object.assign(settings, nextSettings);
    paneRef.current?.refresh();

    if (layoutChanged) setLayoutVersion(version => version + 1);
  }, [options, settings]);

  return (
    <CanvasEffect
      key={layoutVersion}
      effect={matrixEffect}
      options={settings}
      {...props}
    />
  );
};

export default Matrix;
