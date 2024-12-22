import { useEffect, useRef, useState } from 'react';

type Point = {
  x: number;
  y: number;
};

type Direction = 'up' | 'down' | 'left' | 'right';

const CELL_SIZE = 20;
const CELL_GAP = 2;
const CELL_TOT = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const CANVAS_WIDTH = GRID_WIDTH * CELL_TOT;
const CANVAS_HEIGHT = GRID_HEIGHT * CELL_TOT;

class Snake {
  points: Point[] = [];
  direction: Direction = 'right';

  constructor() {
    this.reset();
  }

  reset() {
    const x = 0;
    const y = Math.floor(GRID_HEIGHT / 2);
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

  collidesWithWall(width: number, height: number) {
    const head = this.getHead();
    return head.x < 0 || head.y < 0 || head.x >= width || head.y >= height;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'green';
    this.getBody().forEach(point => {
      ctx.fillRect(
        point.x * CELL_TOT,
        point.y * CELL_TOT,
        CELL_SIZE,
        CELL_SIZE,
      );
    });

    ctx.fillStyle = 'darkgreen';
    const head = this.getHead();
    ctx.fillRect(head.x * CELL_TOT, head.y * CELL_TOT, CELL_SIZE, CELL_SIZE);
  }
}

class Food {
  point: Point = { x: 0, y: 0 };

  constructor(nonLocations: Point[]) {
    this.randomize(nonLocations);
  }

  randomize(nonLocations: Point[]) {
    do {
      this.point = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
      };
    } while (nonLocations.some(p => p.x === this.point.x && p.y === this.point.y));
  }

  getPoint() {
    return this.point;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'red';
    ctx.fillRect(
      this.point.x * CELL_TOT,
      this.point.y * CELL_TOT,
      CELL_SIZE,
      CELL_SIZE,
    );
  }
}

type PlayState = 'waiting' | 'playing' | 'gameover';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }

    let playState: PlayState = 'waiting';

    const snake = new Snake();
    const foods = [new Food(snake.points)];
    let lastTime = 0;
    let dt = 0;
    let acc = 0;

    const tick = () => {
      acc = 0;
      snake.move();
      if (
        snake.collidesWithWall(GRID_WIDTH, GRID_HEIGHT) ||
        snake.collidesWithItself()
      ) {
        playState = 'gameover';
        update(0);
        return;
      }

      const head = snake.getHead();
      foods.forEach(food => {
        if (head.x === food.point.x && head.y === food.point.y) {
          snake.grow();
          food.randomize([...snake.points, ...foods.map(f => f.point)]);
        }
      });

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      snake.draw(ctx);
      foods.forEach(food => food.draw(ctx));
    };

    const update = (time: number) => {
      switch (playState) {
        case 'waiting':
          ctx.fillStyle = 'white';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Press any key to start',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
          );
          return;
        case 'gameover':
          ctx.fillStyle = 'white';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Game Over! Press any key to restart',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
          );
          return;
      }
      dt = time - lastTime;
      lastTime = time;
      acc += dt;

      if (acc > 100) {
        tick();
      }

      if (playState === 'playing') {
        requestAnimationFrame(update);
      }
    };

    update(0);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (playState) {
        case 'waiting':
          playState = 'playing';
          requestAnimationFrame(update);
          break;
        case 'gameover':
          playState = 'playing';
          snake.reset();
          foods.forEach(food => food.randomize([...snake.points, ...foods.map(f => f.point)]));
          requestAnimationFrame(update);
          break;
      }

      function ce() {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
          ce();
          if (snake.setDirection('up')) {
            tick();
          }
          break;
        case 'ArrowDown':
          ce();
          if (snake.setDirection('down')) {
            tick();
          }
          break;
        case 'ArrowLeft':
          ce();
          if (snake.setDirection('left')) {
            tick();
          }
          break;
        case 'ArrowRight':
          ce();
          if (snake.setDirection('right')) {
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
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  );
}
