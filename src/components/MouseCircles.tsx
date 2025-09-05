import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { Vector2 } from '../utils/vec';
import { useEffect, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  initialSize: 50,
  sizeIncrement: 10,
  maxCircles: 200,
  strokeOpacity: 0.5,
  strokeWidth: 1,
  replaceInstead: false,
  startFollowSpeed: 0.05,
  endFollowSpeed: 0.4,
  strokeColor: '#ffffffff',
  fillColor: '#00000000',
};

type MouseCirclesOptions = typeof defaultOptions;

function MouseCircles({ options }: { options: MouseCirclesOptions }) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [mouse, setMouse] = useState<Vector2 | null>(null);
  const [mouses, setMouses] = useState<Vector2[]>([]);

  useAnimationLoop(() => {
    if (!mouse) return;

    const {
      initialSize,
      sizeIncrement,
      maxCircles,
      startFollowSpeed,
      endFollowSpeed,
    } = options;

    setMouses(prev => {
      const newMouses = prev;
      if (options.replaceInstead) {
        newMouses.unshift(mouse);
      }
      if (
        newMouses.length > maxCircles ||
        newMouses.length * sizeIncrement + initialSize >
          Math.hypot(window.innerWidth, window.innerHeight)
      ) {
        newMouses.pop();
      } else if (newMouses.length < maxCircles) {
        newMouses.unshift(mouse);
      }
      return newMouses.map((m, i) =>
        m.lerp(
          mouse,
          startFollowSpeed +
            (i * (endFollowSpeed - startFollowSpeed)) / newMouses.length,
        ),
      );
    });
  });

  useWindowEvent('mousemove', e => {
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouse = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    setMouse(mouse);
  });

  useWindowEvent('touchmove', e => {
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    const mouse = new Vector2(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
    );
    setMouse(mouse);
  });

  return (
    <>
      <svg className="fixed inset-0 -z-10 h-full w-full" ref={setSvg}>
        {mouses.map((mouse, i) => (
          <circle
            key={i}
            cx={mouse.x}
            cy={mouse.y}
            r={options.initialSize + i * options.sizeIncrement}
            stroke={options.strokeColor}
            strokeOpacity={options.strokeOpacity}
            strokeWidth={options.strokeWidth}
            fill={options.fillColor}
          />
        ))}
      </svg>
    </>
  );
}

export default function MouseCirclesWrapper() {
  const [options] = useState<MouseCirclesOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const optionsFolder = pane.addFolder({
        title: 'Options',
        expanded: true,
      });
      optionsFolder.addBinding(options, 'initialSize', {
        min: 10,
        max: 1000,
        step: 10,
      });
      optionsFolder.addBinding(options, 'sizeIncrement', {
        min: 0,
        max: 25,
        step: 0.1,
      });
      optionsFolder.addBinding(options, 'maxCircles', {
        min: 10,
        max: 500,
        step: 10,
      });
      optionsFolder.addBinding(options, 'strokeOpacity', {
        min: 0,
        max: 1,
        step: 0.1,
      });
      optionsFolder.addBinding(options, 'strokeWidth', {
        min: 0.1,
        max: 5,
        step: 0.1,
      });
      optionsFolder.addBinding(options, 'replaceInstead');
      optionsFolder.addBinding(options, 'startFollowSpeed', {
        min: 0.0,
        max: 1,
        step: 0.01,
      });
      optionsFolder.addBinding(options, 'endFollowSpeed', {
        min: 0.0,
        max: 1,
        step: 0.01,
      });
      optionsFolder.addBinding(options, 'strokeColor');
      optionsFolder.addBinding(options, 'fillColor');
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
      presetsFolder.addButton({ title: 'Hacker' }).on('click', () => {
        Object.assign(options, {
          initialSize: 20,
          sizeIncrement: 16.5,
          maxCircles: 100,
          strokeOpacity: 0.7,
          strokeWidth: 1,
          replaceInstead: true,
          startFollowSpeed: 0.01,
          endFollowSpeed: 0.01,
          strokeColor: '#00ff00ff',
          fillColor: '#00ff0000',
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Bubblegum' }).on('click', () => {
        Object.assign(options, {
          initialSize: 10,
          sizeIncrement: 4,
          maxCircles: 100,
          strokeOpacity: 0.3,
          strokeWidth: 2,
          replaceInstead: false,
          startFollowSpeed: 0.21,
          endFollowSpeed: 0.01,
          strokeColor: '#00000000',
          fillColor: '#ff69b405',
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Calm' }).on('click', () => {
        Object.assign(options, {
          initialSize: 100,
          sizeIncrement: 0,
          maxCircles: 70,
          strokeOpacity: 0.2,
          strokeWidth: 0.5,
          replaceInstead: true,
          startFollowSpeed: 0,
          endFollowSpeed: 0,
          strokeColor: '#00000000',
          fillColor: '#1e8fff50',
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Explode' }).on('click', () => {
        Object.assign(options, {
          initialSize: 590,
          sizeIncrement: 25,
          maxCircles: 270,
          strokeOpacity: 0.8,
          strokeWidth: 3.0,
          replaceInstead: false,
          startFollowSpeed: 0.01,
          endFollowSpeed: 0.01,
          strokeColor: '#ff4500ff',
          fillColor: '#ff450000',
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Copy JSON' }).on('click', () => {
        navigator.clipboard.writeText(JSON.stringify(options, null, 2));
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <MouseCircles options={options} />;
}
