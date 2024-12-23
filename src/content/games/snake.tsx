import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

type Point = {
  x: number;
  y: number;
};

type Direction = 'up' | 'down' | 'left' | 'right';

const CELL_SIZE = 20;
const CELL_GAP = 2;
const CELL_TOT = CELL_SIZE + CELL_GAP;

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

  static draw(
    ctx: CanvasRenderingContext2D,
    point: Point,
    prev: Point | null,
    next: Point | null,
    color: string,
  ) {
    ctx.fillStyle = color;
    ctx.fillRect(
      point.x * CELL_TOT + CELL_GAP,
      point.y * CELL_TOT + CELL_GAP,
      CELL_SIZE,
      CELL_SIZE,
    );

    if (prev) {
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      ctx.fillStyle = 'cyan';
      switch (`${dx},${dy}`) {
        case '1,0':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_SIZE,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP,
            CELL_SIZE,
          );
          break;
        case '-1,0':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP,
            CELL_SIZE,
          );
          break;
        case '0,1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_SIZE,
            CELL_SIZE,
            CELL_GAP,
          );
          break;
        case '0,-1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_GAP,
            CELL_SIZE,
            CELL_GAP,
          );
          break;
      }
    }

    if (next) {
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      ctx.fillStyle = 'cyan';
      switch (`${dx},${dy}`) {
        case '1,0':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_SIZE,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP,
            CELL_SIZE,
          );
          break;
        case '-1,0':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP,
            CELL_SIZE,
          );
          break;
        case '0,1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_SIZE,
            CELL_SIZE,
            CELL_GAP,
          );
          break;
        case '0,-1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_GAP,
            CELL_SIZE,
            CELL_GAP,
          );
          break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.getBody().forEach((point, i) => {
      ctx.fillStyle = 'green';
      ctx.fillRect(
        point.x * CELL_TOT + CELL_GAP,
        point.y * CELL_TOT + CELL_GAP,
        CELL_SIZE,
        CELL_SIZE,
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
            point.x * CELL_TOT + CELL_SIZE,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP * 2,
            CELL_SIZE,
          );
          break;
        case '-1,0':
          ctx.fillRect(
            point.x * CELL_TOT - CELL_GAP,
            point.y * CELL_TOT + CELL_GAP,
            CELL_GAP * 2,
            CELL_SIZE,
          );
          break;
        case '0,1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT + CELL_SIZE,
            CELL_SIZE,
            CELL_GAP * 2,
          );
          break;
        case '0,-1':
          ctx.fillRect(
            point.x * CELL_TOT + CELL_GAP,
            point.y * CELL_TOT - CELL_GAP,
            CELL_SIZE,
            CELL_GAP * 2,
          );
          break;
      }
    });

    ctx.fillStyle = 'darkblue';
    const head = this.getHead();
    ctx.fillRect(
      head.x * CELL_TOT + CELL_GAP,
      head.y * CELL_TOT + CELL_GAP,
      CELL_SIZE,
      CELL_SIZE,
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'red';
    this.points.forEach(point =>
      ctx.fillRect(
        point.x * CELL_TOT + CELL_GAP,
        point.y * CELL_TOT + CELL_GAP,
        CELL_SIZE,
        CELL_SIZE,
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
  const [horizontal, setHorizontal] = useState(true);

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
    const touch = touchRef.current!;

    const props = defaultGameProps;

    function setupPane() {
      const pane = new Pane();
      pane.addBinding(props, 'tickDelay', { min: 50, max: 500, step: 50 });
      pane
        .addBinding(props, 'width', { min: 10, max: 30, step: 1 })
        .on('change', () => {
          canvas.width = props.width * CELL_TOT + CELL_GAP;
          gameState.foods.forEach(food => {
            food.regenerate(gameState.getPoints(food.points), props);
          });
          draw();
        });
      pane
        .addBinding(props, 'height', { min: 10, max: 30, step: 1 })
        .on('change', () => {
          canvas.height = props.height * CELL_TOT + CELL_GAP;
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

    const gameState = new GameState(props);
    let lastTime = 0;
    let dt = 0;
    let acc = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gameState.snake.draw(ctx);
      gameState.foods.forEach(food => food.draw(ctx));

      drawText();
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
          setHorizontal(true);
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
            setHorizontal(false);
          }
          break;
        case 'ArrowDown':
          ce();
          if (gameState.snake.setDirection('down')) {
            tick();
            setHorizontal(false);
          }
          break;
        case 'ArrowLeft':
          ce();
          if (gameState.snake.setDirection('left')) {
            tick();
            setHorizontal(true);
          }
          break;
        case 'ArrowRight':
          ce();
          if (gameState.snake.setDirection('right')) {
            tick();
            setHorizontal(true);
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
          setHorizontal(true);
          requestAnimationFrame(update);
          return;
      }

      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;

      const rect = canvas.getBoundingClientRect();
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;

      switch (gameState.snake.direction) {
        case 'up':
        case 'down':
          if (canvasX < canvas.width / 2) {
            gameState.snake.setDirection('left');
          } else {
            gameState.snake.setDirection('right');
          }
          tick();
          setHorizontal(true);
          break;
        case 'left':
        case 'right':
          if (canvasY < canvas.height / 2) {
            gameState.snake.setDirection('up');
          } else {
            gameState.snake.setDirection('down');
          }
          tick();
          setHorizontal(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    touch.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      touch.removeEventListener('touchstart', handleTouchStart);
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
        {isTouch && (
          <div className="absolute inset-0 -z-10">
            {horizontal ? (
              <>
                <div className="absolute bottom-1/2 left-0 right-0 top-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      fill="#fff2"
                      d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 top-1/2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      fill="#fff2"
                      d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"
                    />
                  </svg>
                </div>
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/25" />
              </>
            ) : (
              <>
                <div className="absolute bottom-0 left-0 right-1/2 top-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      fill="#fff2"
                      d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-1/2 right-0 top-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      fill="#fff2"
                      d="M8.58,16.58L13.17,12L8.58,7.41L10,6L16,12L10,18L8.58,16.58Z"
                    />
                  </svg>
                </div>
              <div className="absolute bottom-0 left-1/2 top-0 w-[1px] bg-white/25" />
              </>
            )}
            <div className="absolute bottom-0 left-1/2 top-0 w-[1px] bg-white/5" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/5" />
          </div>
        )}
        <canvas
          className="border border-white"
          ref={canvasRef}
          width={defaultGameProps.width * CELL_TOT + CELL_GAP}
          height={defaultGameProps.height * CELL_TOT + CELL_GAP}
        />
      </div>
    </div>
  );
}
