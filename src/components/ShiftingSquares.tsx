import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { mod, random, randomBool } from '../utils/mathUtils';
import { useEffect, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  size: 50,
  delay: 4000,
  randomDelay: 5000,
  transitionTime: 300,
  moveSpeedX: 0.0005,
  moveSpeedY: 0.0002,
  colors: ['#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d', '#ff4dff', '#4dffff'],
};

type ShiftingSquaresOptions = typeof defaultOptions;

class Square {
  private _x: number;
  private _y: number;
  get x() {
    return Math.floor(this._x);
  }
  set x(value: number) {
    this._x = value;
  }
  get y() {
    return Math.floor(this._y);
  }
  set y(value: number) {
    this._y = value;
  }
  options: ShiftingSquaresOptions;
  size: number;
  get colors(): string[] {
    return this.options.colors;
  }
  colorIndex: number;
  timeToNextColor: number;
  startTime: number;
  delay: number;
  prevRandomDelay: number;
  randomDelay: number;
  transitionTime: number;
  vertical: boolean;

  constructor(x: number, y: number, options: ShiftingSquaresOptions) {
    this._x = x;
    this._y = y;
    this.options = options;
    this.size = options.size;
    this.colorIndex = options.colors.length;
    this.prevRandomDelay = random(-options.randomDelay, options.randomDelay);
    this.startTime = this.timeToNextColor =
      options.delay + this.prevRandomDelay;
    this.timeToNextColor -= random(0, this.timeToNextColor);
    this.delay = options.delay;
    this.randomDelay = options.randomDelay;
    this.transitionTime = options.transitionTime;
    this.vertical = randomBool();
  }

  update(
    dt: number,
    screenWidth: number,
    screenHeight: number,
    options: ShiftingSquaresOptions,
  ) {
    screenWidth = Math.ceil(screenWidth / this.size + 1) * this.size;
    screenHeight = Math.ceil(screenHeight / this.size + 1) * this.size;
    this.x =
      mod(
        this._x + this.size + dt * options.moveSpeedX * this.size,
        screenWidth,
      ) - this.size;
    this.y =
      mod(
        this._y + this.size + dt * options.moveSpeedY * this.size,
        screenHeight,
      ) - this.size;

    if (this.timeToNextColor > 0) {
      this.timeToNextColor -= dt;
      if (this.timeToNextColor < 0) {
        this.timeToNextColor = 0;
      }
    } else {
      this.colorIndex++;
      const nextRandomDelay = random(
        0,
        this.delay - this.prevRandomDelay + this.randomDelay / 2 < 0
          ? this.randomDelay + this.prevRandomDelay
          : this.randomDelay,
      );
      if (this.delay - this.prevRandomDelay + nextRandomDelay < 0) {
        this.startTime = this.timeToNextColor = this.delay + nextRandomDelay;
        this.prevRandomDelay += nextRandomDelay;
      } else {
        this.startTime = this.timeToNextColor =
          this.delay - this.prevRandomDelay + nextRandomDelay;
        this.prevRandomDelay = nextRandomDelay;
      }
      this.vertical = randomBool();
    }
  }

  getColor() {
    return this.colors[this.colorIndex % this.colors.length];
  }

  getPreviousColor() {
    return this.colors[
      (this.colorIndex - 1 + this.colors.length) % this.colors.length
    ];
  }

  *drawMain(ctx: CanvasRenderingContext2D) {
    const color = this.getColor();
    if (this.colorIndex === 0) {
      ctx.fillStyle = color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      return;
    }

    const amount = Math.min(
      1,
      (this.startTime - this.timeToNextColor) / this.transitionTime,
    );

    ctx.save();

    ctx.fillStyle = color;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillRect(
      this.x,
      this.y,
      this.size * (this.vertical ? 1 : amount),
      this.size * (this.vertical ? amount : 1),
    );

    ctx.restore();

    yield;

    ctx.fillStyle = color;
    ctx.fillRect(
      this.x,
      this.y,
      this.size * (this.vertical ? 1 : amount),
      this.size * (this.vertical ? amount : 1),
    );
  }

  *drawPrevious(ctx: CanvasRenderingContext2D) {
    if (this.colorIndex === 0) {
      return;
    }
    const prevColor = this.getPreviousColor();

    const amount = Math.min(
      1,
      (this.startTime - this.timeToNextColor) / this.transitionTime,
    );

    ctx.save();
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = prevColor;
    ctx.fillRect(
      this.x + (this.vertical ? 1 : this.size * amount),
      this.y + (this.vertical ? this.size * amount : 1),
      this.size * (this.vertical ? 1 : 1 - amount),
      this.size * (this.vertical ? 1 - amount : 1),
    );
    ctx.restore();
    yield;
    ctx.fillStyle = prevColor;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

function ShiftingSquares({ options }: { options: ShiftingSquaresOptions }) {
  const [squares, setSquares] = useState<Square[]>([]);
  const [ctx, canvas, setCanvas] = useCanvas({
    autoResize: true,
    contextId: '2d',
    resize: () => {
      setSquares([]);
    },
  });

  // Reset squares when options change
  useEffect(() => {
    setSquares([]);
  }, [options.size]);

  useAnimationLoop((dt, time) => {
    if (!ctx || !canvas) return;

    const cols = Math.ceil(canvas.width / options.size);
    const rows = Math.ceil(canvas.height / options.size);

    if (
      squares.length === 0 ||
      squares[0].size !== options.size ||
      squares.length !== (cols + 1) * (rows + 1)
    ) {
      squares.length = 0;
      for (let x = 0; x <= cols; x++) {
        for (let y = 0; y <= rows; y++) {
          squares.push(new Square(x * options.size, y * options.size, options));
        }
      }
      setSquares(squares);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw squares
    squares.forEach(square => {
      square.update(dt, canvas.width, canvas.height, options);
    });

    // Categorize squares by color index
    const colorMap: { [key: number]: Square[] } = {};
    squares.forEach(square => {
      if (!colorMap[square.colorIndex]) {
        colorMap[square.colorIndex] = [];
      }
      colorMap[square.colorIndex].push(square);
    });

    // Draw squares by color index
    const keys = Object.keys(colorMap)
      .map(key => parseInt(key))
      .sort((a, b) => a - b);

    for (let i = 0; i <= keys.length; i++) {
      const key = keys[i];
      const prevKey = keys[(i - 1 + keys.length) % keys.length];
      const group = colorMap[key] || [];
      const prevGroup = colorMap[prevKey] || [];

      const drawPrevGenerators = prevGroup.map(square => square.drawMain(ctx));
      const drawGenerators = group.map(square => square.drawPrevious(ctx));

      let done = false;
      while (!done) {
        done = true;
        drawPrevGenerators.forEach(gen => {
          const result = gen.next();
          if (!result.done) {
            done = false;
          }
        });
        drawGenerators.forEach(gen => {
          const result = gen.next();
          if (!result.done) {
            done = false;
          }
        });
      }
    }
  });

  return (
    <canvas className="fixed inset-0 -z-10 h-full w-full" ref={setCanvas} />
  );
}

export default function ShiftingSquaresWrapper() {
  const [options] = useState<ShiftingSquaresOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const gridFolder = pane.addFolder({
        title: 'Grid',
        expanded: true,
      });
      gridFolder.addBinding(options, 'size', {
        min: 20,
        max: 200,
        step: 5,
      });
    }

    {
      const motionFolder = pane.addFolder({
        title: 'Motion',
        expanded: true,
      });
      motionFolder.addBinding(options, 'moveSpeedX', {
        min: -0.01,
        max: 0.01,
        step: 0.0001,
      });
      motionFolder.addBinding(options, 'moveSpeedY', {
        min: -0.01,
        max: 0.01,
        step: 0.0001,
      });
    }

    {
      const timingFolder = pane.addFolder({
        title: 'Timing',
        expanded: true,
      });
      timingFolder.addBinding(options, 'delay', {
        min: 500,
        max: 10000,
        step: 100,
      });
      timingFolder.addBinding(options, 'randomDelay', {
        min: 0,
        max: 10000,
        step: 100,
      });
      timingFolder.addBinding(options, 'transitionTime', {
        min: 50,
        max: 2000,
        step: 50,
      });
    }

    const colorsFolder = pane.addFolder({
      title: 'Colors',
      expanded: false,
    });
    const colors = options.colors.map((color, index) =>
      colorsFolder.addBinding(options.colors, index, {
        label: `Color ${index + 1}`,
      }),
    );

    colorsFolder.addButton({ title: 'Add Color' }).on('click', () => {
      options.colors.push('#ffffff');
      pane.refresh();
      colors.push(
        colorsFolder.addBinding(options.colors, options.colors.length - 1, {
          label: `Color ${options.colors.length}`,
          index: options.colors.length - 1,
        }),
      );
    });
    if (options.colors.length > 1) {
      const btn = colorsFolder
        .addButton({ title: 'Remove Last Color' })
        .on('click', () => {
          options.colors.pop();
          pane.refresh();
          const toRemove = colors.pop();
          if (toRemove) {
            toRemove.dispose();
          }
        })
        .element.querySelector('button')!;
      btn.classList.add('btn-danger');
    }

    const resetColorsFolder = () => {
      colors.forEach(color => color.dispose());
      colors.length = 0;
      options.colors.forEach((color, index) => {
        colors.push(
          colorsFolder.addBinding(options.colors, index, {
            label: `Color ${index + 1}`,
            index,
          }),
        );
      });
    };

    {
      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });
      presetsFolder.addButton({ title: 'Default' }).on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Fast & Small' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          size: 25,
          delay: 2000,
          randomDelay: 2000,
          transitionTime: 150,
          moveSpeedX: 0.001,
          moveSpeedY: 0.0005,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Slow & Large' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          size: 100,
          delay: 8000,
          randomDelay: 8000,
          transitionTime: 600,
          moveSpeedX: 0.0002,
          moveSpeedY: 0.0001,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Minimal Motion' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          moveSpeedX: 0.00001,
          moveSpeedY: 0.00001,
          delay: 6000,
          randomDelay: 3000,
        });
        pane.refresh();
      });
    }

    {
      const colorFolder = pane.addFolder({
        title: 'Color Presets',
        expanded: false,
      });

      colorFolder.addButton({ title: 'Warm Tones' }).on('click', () => {
        options.colors = [
          '#ff4d4d',
          '#ff944d',
          '#ffff4d',
          '#ff4d94',
          '#ff4dff',
        ];
        resetColorsFolder();
        pane.refresh();
      });

      colorFolder.addButton({ title: 'Cool Tones' }).on('click', () => {
        options.colors = [
          '#4d4dff',
          '#4d94ff',
          '#4dffff',
          '#4dff94',
          '#4dff4d',
        ];
        resetColorsFolder();
        pane.refresh();
      });

      colorFolder.addButton({ title: 'Greyscale' }).on('click', () => {
        options.colors = [
          '#111111',
          '#444444',
          '#888888',
          '#bbbbbb',
          '#eeeeee',
        ];
        resetColorsFolder();
        pane.refresh();
      });

      colorFolder.addButton({ title: 'Random Colors' }).on('click', () => {
        const newColors = [];
        const numColors = Math.floor(random(3, 10));
        for (let i = 0; i < numColors; i++) {
          newColors.push(
            `hsl(${Math.floor(random(0, 360))}, ${Math.floor(
              random(50, 100),
            )}%, ${Math.floor(random(40, 80))}%)`,
          );
        }
        options.colors = newColors;
        resetColorsFolder();
        pane.refresh();
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <ShiftingSquares options={options} />;
}
