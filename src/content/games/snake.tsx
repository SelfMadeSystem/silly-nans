import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

type Point = {
  x: number;
  y: number;
};

type Direction = 'up' | 'down' | 'left' | 'right';

class Snake {
  points: Point[] = [];
  direction: Direction = 'right';

  constructor(gameProps: GameProps) {
    this.reset(gameProps);
  }

  reset(gameProps: GameProps) {
    const x = 0;
    const y = Math.floor(gameProps.height / 2);
    this.points = [
      { x, y },
      { x, y },
      { x, y },
      { x, y },
    ];
    this.direction = 'right';
  }

  move() {
    const head = this.points[0];
    let newHead: Point = { x: head.x, y: head.y };
    switch (this.direction) {
      case 'up':
        newHead.y -= 1;
        break;
      case 'down':
        newHead.y += 1;
        break;
      case 'left':
        newHead.x -= 1;
        break;
      case 'right':
        newHead.x += 1;
        break;
    }

    this.points.unshift(newHead);
    this.points.pop();
  }

  setHead(point: Point) {
    this.points[0] = point;
  }

  grow() {
    const tail = this.points[this.points.length - 1];
    const newTail: Point = { x: tail.x, y: tail.y };
    this.points.push(newTail);
  }

  setDirection(direction: Direction) {
    if (
      ((direction === 'up' || direction === 'down') &&
        (this.direction === 'up' || this.direction === 'down')) ||
      ((direction === 'left' || direction === 'right') &&
        (this.direction === 'left' || this.direction === 'right'))
    ) {
      return false;
    }

    this.direction = direction;
    return true;
  }

  getHead() {
    return this.points[0];
  }

  getBody() {
    return this.points.slice(1);
  }

  collidesWith(point: Point) {
    return this.points.some(p => p.x === point.x && p.y === point.y);
  }

  collidesWithItself() {
    return this.getBody().some(
      p => this.getHead().x === p.x && this.getHead().y === p.y,
    );
  }

  collidesWithWall({ width, height }: GameProps) {
    const head = this.getHead();
    return head.x < 0 || head.y < 0 || head.x >= width || head.y >= height;
  }

  draw(ctx: CanvasRenderingContext2D, props: GameProps) {
    this.getBody().forEach((point, i) => {
      ctx.fillStyle = 'green';
      ctx.fillRect(
        point.x * (props.cellSize + props.cellGap) + props.cellGap,
        point.y * (props.cellSize + props.cellGap) + props.cellGap,
        props.cellSize,
        props.cellSize,
      );
      const prev = this.points[i];
      if (!prev) {
        return;
      }
      const dx = prev.x - point.x;
      const dy = prev.y - point.y;

      switch (`${dx},${dy}`) {
        case '1,0':
          ctx.fillRect(
            point.x * (props.cellSize + props.cellGap) + props.cellSize,
            point.y * (props.cellSize + props.cellGap) + props.cellGap,
            props.cellGap * 2,
            props.cellSize,
          );
          break;
        case '-1,0':
          ctx.fillRect(
            point.x * (props.cellSize + props.cellGap) - props.cellGap,
            point.y * (props.cellSize + props.cellGap) + props.cellGap,
            props.cellGap * 2,
            props.cellSize,
          );
          break;
        case '0,1':
          ctx.fillRect(
            point.x * (props.cellSize + props.cellGap) + props.cellGap,
            point.y * (props.cellSize + props.cellGap) + props.cellSize,
            props.cellSize,
            props.cellGap * 2,
          );
          break;
        case '0,-1':
          ctx.fillRect(
            point.x * (props.cellSize + props.cellGap) + props.cellGap,
            point.y * (props.cellSize + props.cellGap) - props.cellGap,
            props.cellSize,
            props.cellGap * 2,
          );
          break;
      }
    });

    ctx.fillStyle = 'darkblue';
    const head = this.getHead();
    ctx.fillRect(
      head.x * (props.cellSize + props.cellGap) + props.cellGap,
      head.y * (props.cellSize + props.cellGap) + props.cellGap,
      props.cellSize,
      props.cellSize,
    );
  }
}

class Food {
  points: Point[] = [];

  constructor(nonLocations: Point[], gameProps: GameProps) {
    this.randomize(nonLocations, gameProps);
  }

  private static getPoint(nonLocations: Point[], gameProps: GameProps) {
    let point: Point;
    do {
      point = {
        x: Math.floor(Math.random() * gameProps.width),
        y: Math.floor(Math.random() * gameProps.height),
      };
    } while (nonLocations.some(p => p.x === point.x && p.y === point.y));

    return point;
  }

  getAppleCount(gameProps: GameProps) {
    switch (gameProps.appleType) {
      case 'normal':
        return 1;
      case 'portal':
        return 2;
    }
  }

  randomize(nonLocations: Point[], gameProps: GameProps) {
    const count = this.getAppleCount(gameProps);
    if (nonLocations.length >= gameProps.width * gameProps.height - count) {
      this.points = [];
      return;
    }

    this.points = [];

    for (let i = 0; i < count; i++) {
      this.points.push(
        Food.getPoint([...nonLocations, ...this.points], gameProps),
      );
    }
  }

  regenerate(nonLocations: Point[], gameProps: GameProps) {
    if (
      (this.points.length > 0 &&
        this.getAppleCount(gameProps) !== this.points.length) ||
      this.points.some(
        p =>
          nonLocations.some(nl => nl.x === p.x && nl.y === p.y) ||
          p.x >= gameProps.width ||
          p.y >= gameProps.height,
      )
    ) {
      this.randomize(nonLocations, gameProps);
    }
  }

  eat(pos: Point, snake: Snake, gameState: GameState, gameProps: GameProps) {
    const idx = this.points.findIndex(p => p.x === pos.x && p.y === pos.y);
    if (idx !== -1) {
      switch (gameProps.appleType) {
        case 'normal':
          snake.grow();
          break;
        case 'portal':
          snake.grow();
          snake.move();
          snake.setHead(this.points[(idx + 1) % 2]);
          break;
      }
      this.randomize(gameState.getPoints(), gameProps);
    }
  }

  draw(ctx: CanvasRenderingContext2D, props: GameProps) {
    ctx.fillStyle = 'red';
    this.points.forEach(point =>
      ctx.fillRect(
        point.x * (props.cellSize + props.cellGap) + props.cellGap,
        point.y * (props.cellSize + props.cellGap) + props.cellGap,
        props.cellSize,
        props.cellSize,
      ),
    );
  }
}

type PlayState = 'waiting' | 'playing' | 'gameover';
type AppleType = 'normal' | 'portal';

const defaultGameProps = {
  tickDelay: 100,
  width: 20,
  height: 20,
  cellSize: 20,
  cellGap: 2,
  apples: 1,
  appleType: 'normal' as AppleType,
};

type GameProps = typeof defaultGameProps;

class GameState {
  public snake: Snake;
  public foods: Food[];
  public playState: PlayState;
  public props: GameProps;

  constructor(props: GameProps) {
    this.snake = new Snake(props);
    this.foods = Array.from(
      { length: props.apples },
      () => new Food([], props),
    );
    this.playState = 'waiting';
    this.props = props;
  }

  getPoints(exclude: Point[] = []): Point[] {
    const points: Point[] = [
      ...this.snake.points,
      ...this.foods.flatMap(f => f.points),
    ];
    return points.filter(p => !exclude.some(e => e.x === p.x && e.y === p.y));
  }

  reset() {
    this.playState = 'playing';
    this.snake.reset(this.props);
    this.foods.forEach(food => food.randomize(this.getPoints(), this.props));
  }
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window);
    const canvas = canvasRef.current!;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const touchDiv = touchRef.current!;

    const props = defaultGameProps;
    let joystickActive = false;
    const joystick = { x: 0, y: 0 };
    const joystickDiff = { x: 0, y: 0 };
    const touchThreshold = 30;

    function setupPane() {
      const pane = new Pane();
      pane.addBinding(props, 'tickDelay', { min: 50, max: 500, step: 50 });
      pane
        .addBinding(props, 'width', { min: 10, max: 30, step: 1 })
        .on('change', () => {
          resizeCanavas();
          gameState.foods.forEach(food => {
            food.regenerate(gameState.getPoints(food.points), props);
          });
          draw();
        });
      pane
        .addBinding(props, 'height', { min: 10, max: 30, step: 1 })
        .on('change', () => {
          resizeCanavas();
          gameState.foods.forEach(food => {
            food.regenerate(gameState.getPoints(food.points), props);
          });
          draw();
        });
      pane
        .addBinding(props, 'apples', { min: 1, max: 20, step: 1 })
        .on('change', () => {
          while (gameState.foods.length < props.apples) {
            gameState.foods.push(new Food(gameState.getPoints(), props));
          }
          while (gameState.foods.length > props.apples) {
            gameState.foods.pop();
          }
          draw();
        });
      pane
        .addBinding(props, 'appleType', {
          options: {
            normal: 'normal',
            portal: 'portal',
          },
        })
        .on('change', () => {
          gameState.foods.forEach(food => {
            food.regenerate(gameState.getPoints(food.points), props);
          });
          draw();
        });
    }

    setupPane();

    const resizeCanavas = () => {
      props.cellSize = Math.min(
        20,
        Math.floor(
          (window.innerWidth - props.cellGap * (props.width + 1)) /
            (props.width + 2),
        ),
      );
      canvas.width =
        props.width * (props.cellSize + props.cellGap) + props.cellGap;
      canvas.height =
        props.height * (props.cellSize + props.cellGap) + props.cellGap;
    };

    const gameState = new GameState(props);
    let lastTime = 0;
    let dt = 0;
    let acc = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gameState.snake.draw(ctx, props);
      gameState.foods.forEach(food => food.draw(ctx, props));

      drawText();
      if (joystickActive) drawJoystick();
    };

    const drawText = () => {
      switch (gameState.playState) {
        case 'waiting':
          ctx.fillStyle = 'white';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Press any key to start',
            canvas.width / 2,
            canvas.height / 2,
          );
          break;
        case 'gameover':
          ctx.fillStyle = 'white';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Game Over! Press any key to restart',
            canvas.width / 2,
            canvas.height / 2,
          );
          break;
      }
    };

    const drawJoystick = () => {
      const joystickSize = 10;
      const totalSize = joystickSize + touchThreshold;
      ctx.strokeStyle = '#fff6';
      ctx.beginPath();
      ctx.arc(
        joystick.x,
        joystick.y,
        totalSize,
        0,
        Math.PI * 2,
      );
      ctx.moveTo(
        joystick.x + totalSize,
        joystick.y + totalSize,
      )
      ctx.lineTo(
        joystick.x - totalSize,
        joystick.y - totalSize,
      );
      ctx.moveTo(
        joystick.x - totalSize,
        joystick.y + totalSize,
      )
      ctx.lineTo(
        joystick.x + totalSize,
        joystick.y - totalSize,
      );
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const joystickAngle = Math.atan2(joystickDiff.y, joystickDiff.x);
      const joystickDist = Math.min(
        touchThreshold,
        Math.sqrt(
          joystickDiff.x * joystickDiff.x + joystickDiff.y * joystickDiff.y,
        ),
      );
      const x = joystick.x + Math.cos(joystickAngle) * joystickDist;
      const y = joystick.y + Math.sin(joystickAngle) * joystickDist;
      ctx.arc(x, y, joystickSize, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      acc = 0;
      gameState.snake.move();
      if (
        gameState.snake.collidesWithWall(props) ||
        gameState.snake.collidesWithItself()
      ) {
        gameState.playState = 'gameover';
        update(0);
        draw();
        return;
      }

      const head = gameState.snake.getHead();

      gameState.foods.forEach(food => {
        food.eat(head, gameState.snake, gameState, props);
      });

      draw();
    };

    const update = (time: number) => {
      dt = time - lastTime;
      lastTime = time;
      acc += dt;

      if (acc > props.tickDelay) {
        tick();
      }

      if (gameState.playState === 'playing') {
        requestAnimationFrame(update);
      }
    };

    drawText();

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (gameState.playState) {
        case 'waiting':
          gameState.playState = 'playing';
          requestAnimationFrame(update);
          ce();
          return;
        case 'gameover':
          gameState.reset();
          requestAnimationFrame(update);
          ce();
          return;
      }

      switch (e.key) {
        case 'ArrowUp':
          ce();
          if (gameState.snake.setDirection('up')) {
            tick();
          }
          break;
        case 'ArrowDown':
          ce();
          if (gameState.snake.setDirection('down')) {
            tick();
          }
          break;
        case 'ArrowLeft':
          ce();
          if (gameState.snake.setDirection('left')) {
            tick();
          }
          break;
        case 'ArrowRight':
          ce();
          if (gameState.snake.setDirection('right')) {
            tick();
          }
          break;
      }

      function ce() {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      switch (gameState.playState) {
        case 'waiting':
          gameState.playState = 'playing';
          requestAnimationFrame(update);
          return;
        case 'gameover':
          gameState.reset();
          requestAnimationFrame(update);
          return;
      }

      const touch = e.touches[0];
      const jx = touch.clientX;
      const jy = touch.clientY;
      joystickActive = true;
      const rect = canvas.getBoundingClientRect();
      joystick.x = jx - rect.left;
      joystick.y = jy - rect.top;
      let didStart = false;

      const onMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const cx = touch.clientX - rect.left;
        const cy = touch.clientY - rect.top;
        const dx = cx - joystick.x;
        const dy = cy - joystick.y;

        joystickDiff.x = dx;
        joystickDiff.y = dy;

        const distSq = dx * dx + dy * dy;

        e.preventDefault();
        e.stopPropagation();

        if (!didStart && distSq < touchThreshold) {
          return;
        }

        didStart = true;

        const angle = Math.atan2(dy, dx);
        let didMove = false;

        if (angle > -Math.PI / 4 && angle < Math.PI / 4) {
          didMove = gameState.snake.setDirection('right');
        } else if (angle > Math.PI / 4 && angle < (3 * Math.PI) / 4) {
          didMove = gameState.snake.setDirection('down');
        } else if (angle < -Math.PI / 4 && angle > (-3 * Math.PI) / 4) {
          didMove = gameState.snake.setDirection('up');
        } else {
          didMove = gameState.snake.setDirection('left');
        }

        if (didMove) {
          tick();
        }
      };

      const onEnd = () => {
        touchDiv.removeEventListener('touchmove', onMove);
        touchDiv.removeEventListener('touchend', onEnd);
        joystickActive = false;
      };

      touchDiv.addEventListener('touchmove', onMove);
      touchDiv.addEventListener('touchend', onEnd);
    };

    resizeCanavas();

    window.addEventListener('keydown', handleKeyDown);
    touchDiv.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      touchDiv.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="flex justify-center">
      <div
        className={classNames(
          'relative isolate mx-auto border border-white/25',
          isTouch && 'p-24',
        )}
        ref={touchRef}
      >
        <canvas
          className="border border-white"
          ref={canvasRef}
          width={200}
          height={200}
        />
      </div>
    </div>
  );
}
