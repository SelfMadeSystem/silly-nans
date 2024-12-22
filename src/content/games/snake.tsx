import { useEffect, useRef } from 'react';
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'green';
    this.getBody().forEach(point => {
      ctx.fillRect(
        point.x * CELL_TOT + CELL_GAP,
        point.y * CELL_TOT + CELL_GAP,
        CELL_SIZE,
        CELL_SIZE,
      );
    });

    ctx.fillStyle = 'darkgreen';
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
      this.randomize(gameState.getPoints(this.points), gameProps);
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

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

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
      pane.addBinding(props, 'appleType', {
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
          break;
        case 'gameover':
          gameState.reset();
          requestAnimationFrame(update);
          break;
      }

      function ce() {
        e.preventDefault();
        e.stopPropagation();
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <canvas
      className="mx-auto border border-white"
      ref={canvasRef}
      width={defaultGameProps.width * CELL_TOT + CELL_GAP}
      height={defaultGameProps.height * CELL_TOT + CELL_GAP}
    />
  );
}
