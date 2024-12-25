import createCanvasComponent from '../../components/CanvasComponent';

type Vec2 = { x: number; y: number };

type Block = {
  pos: Vec2;
  color: string;
};

function isBlockValid(vec: Vec2, board: Board) {
  return (
    vec.x >= 0 &&
    vec.x < board.width &&
    vec.y < board.height &&
    !board.at(vec.x, vec.y)
  );
}

class Tetromino {
  blocks: Block[];
  constructor(
    blocks: Vec2[],
    color: string,
    public id: string,
  ) {
    this.blocks = blocks.map(pos => ({ pos, color }));
  }

  move(delta: Vec2) {
    this.blocks.forEach(block => {
      block.pos.x += delta.x;
      block.pos.y += delta.y;
    });
  }

  rotateICw(i: number): Vec2 {
    const center = this.blocks[1].pos;
    const x = this.blocks[i].pos.x - center.x;
    const y = this.blocks[i].pos.y - center.y;
    return { x: center.x - y, y: center.y + x };
  }

  rotateCw() {
    this.blocks.forEach((block, i) => {
      block.pos = this.rotateICw(i);
    });
  }

  rotateICcw(i: number): Vec2 {
    const center = this.blocks[1].pos;
    const x = this.blocks[i].pos.x - center.x;
    const y = this.blocks[i].pos.y - center.y;
    return { x: center.x + y, y: center.y - x };
  }

  rotateCcw() {
    this.blocks.forEach((block, i) => {
      block.pos = this.rotateICcw(i);
    });
  }

  canMove(delta: Vec2, board: Board) {
    return this.blocks.every(block => {
      const x = block.pos.x + delta.x;
      const y = block.pos.y + delta.y;
      return isBlockValid({ x, y }, board);
    });
  }

  canRotateCw(board: Board) {
    return this.blocks.every((block, i) => {
      const v = this.rotateICw(i);
      return isBlockValid(v, board);
    });
  }

  canRotateCcw(board: Board) {
    return this.blocks.every((block, i) => {
      const v = this.rotateICcw(i);
      return isBlockValid(v, board);
    });
  }

  clone() {
    return new Tetromino(
      this.blocks.map(block => ({ ...block.pos })),
      this.blocks[0].color,
      this.id,
    );
  }

  reset() {
    return getTetromino(this.id as TetrominoType);
  }
}

const TETROMINOS = {
  I: new Tetromino(
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ],
    'cyan',
    'I',
  ),
  J: new Tetromino(
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    'blue',
    'J',
  ),
  L: new Tetromino(
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ],
    'orange',
    'L',
  ),
  O: new Tetromino(
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    'yellow',
    'O',
  ),
  S: new Tetromino(
    [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
    ],
    'green',
    'S',
  ),
  T: new Tetromino(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    'purple',
    'T',
  ),
  Z: new Tetromino(
    [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    'red',
    'Z',
  ),
} as const;

type TetrominoType = keyof typeof TETROMINOS;
const TETROMINO_TYPES = Object.keys(TETROMINOS) as TetrominoType[];

const getTetromino = (type: TetrominoType) => TETROMINOS[type].clone();

class Board {
  width: number;
  height: number;
  blocks: (string | undefined)[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.blocks = Array.from({ length: height }, () => Array(width).fill(null));
  }

  at(x: number, y: number) {
    return this.blocks[y]?.[x];
  }

  set(x: number, y: number, color: string) {
    this.blocks[y][x] = color;
  }

  setTetromino(tetromino: Tetromino) {
    tetromino.blocks.forEach(block => {
      this.set(block.pos.x, block.pos.y, block.color);
    });
  }

  clearLines(): number {
    let linesCleared = 0;
    for (let y = 0; y < this.height; y++) {
      const line = this.blocks[y];
      if (line.every(block => block !== null)) {
        this.blocks.splice(y, 1);
        this.blocks.unshift(Array(this.width).fill(null));
        linesCleared++;
      }
    }
    return linesCleared;
  }

  getBlocks(): Block[] {
    return this.blocks
      .flatMap((row, y) =>
        row.map((color, x) => (color ? { pos: { x, y }, color } : null)),
      )
      .filter(block => block !== null) as Block[];
  }
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 20;

type PlayState = 'waiting' | 'paused' | 'playing' | 'gameover';

type TetrominoPool = Tetromino[];

function newTetrominoPool(): TetrominoPool {
  const poolSize = 2;

  const keys = [
    ...Array.from({ length: poolSize }, () => TETROMINO_TYPES).flat(),
  ];

  keys.sort(() => Math.random() - 0.5);

  return keys.map(key => getTetromino(key));
}

type GameState = {
  board: Board;
  tetromino: Tetromino;
  pool: TetrominoPool;
  heldTetromino: Tetromino | null;
  held: boolean;
  playState: PlayState;
  score: number;
  tickInterval: number;
};

const initialGameState = (): GameState => {
  const pool = newTetrominoPool();
  const firstTetromino = pool.pop()!;
  firstTetromino.move({ x: Math.floor(BOARD_WIDTH / 2 - 1), y: 0 });
  return {
    board: new Board(BOARD_WIDTH, BOARD_HEIGHT),
    tetromino: firstTetromino,
    pool,
    heldTetromino: null,
    held: false,
    playState: 'waiting',
    score: 0,
    tickInterval: 1000,
  };
};

class Tetris {
  public gameState = initialGameState();
  public intervalId: number | null = null;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  moveTetromino(delta: Vec2) {
    if (this.gameState.playState !== 'playing') {
      return;
    }
    if (this.gameState.tetromino.canMove(delta, this.gameState.board)) {
      this.gameState.tetromino.move(delta);
      this.draw();
    }
  }

  rotateTetrominoCw() {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    if (this.gameState.tetromino.canRotateCw(this.gameState.board)) {
      this.gameState.tetromino.rotateCw();
      this.draw();
    }
  }

  rotateTetrominoCcw() {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    if (this.gameState.tetromino.canRotateCcw(this.gameState.board)) {
      this.gameState.tetromino.rotateCcw();
      this.draw();
    }
  }

  dropTetromino(key = false) {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    if (key) {
      this.gameState.score += 1;
    }

    if (
      this.gameState.tetromino.canMove({ x: 0, y: 1 }, this.gameState.board)
    ) {
      this.gameState.tetromino.move({ x: 0, y: 1 });
      this.draw();
    } else {
      this.gameState.board.setTetromino(this.gameState.tetromino);
      const linesCleared = this.gameState.board.clearLines();
      this.gameState.score +=
        linesCleared === 0 ? 0 : Math.pow(2, linesCleared - 1) * 100;
      this.gameState.tetromino = this.gameState.pool.pop()!;
      if (this.gameState.pool.length === 0) {
        this.gameState.pool = newTetrominoPool();
      }
      this.gameState.tetromino.move({
        x: Math.floor(BOARD_WIDTH / 2 - 1),
        y: 0,
      });
      if (
        !this.gameState.tetromino.canMove({ x: 0, y: 0 }, this.gameState.board)
      ) {
        this.gameState.playState = 'gameover';
      }
      this.gameState.held = false;
      this.draw();
    }
  }

  hardDropTetromino() {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    while (
      this.gameState.tetromino.canMove({ x: 0, y: 1 }, this.gameState.board)
    ) {
      this.gameState.tetromino.move({ x: 0, y: 1 });
      this.gameState.score += 2;
    }
    this.dropTetromino();
  }

  holdTetromino() {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    if (this.gameState.held) {
      return;
    }

    this.gameState.held = true;

    if (this.gameState.heldTetromino === null) {
      this.gameState.heldTetromino = this.gameState.tetromino.reset();
      this.gameState.tetromino = this.gameState.pool.pop()!;
      if (this.gameState.pool.length === 0) {
        this.gameState.pool = newTetrominoPool();
      }
    } else {
      const temp = this.gameState.tetromino.reset();
      this.gameState.tetromino = this.gameState.heldTetromino;
      this.gameState.heldTetromino = temp;
    }
    this.gameState.tetromino.move({
      x: Math.floor(BOARD_WIDTH / 2 - 1),
      y: 0,
    });
    this.draw();
  }

  startGame() {
    this.gameState = initialGameState();
    this.gameState.playState = 'playing';
    this.setInterval(this.gameState.tickInterval);
    this.draw();
  }

  pauseGame() {
    switch (this.gameState.playState) {
      case 'playing':
        this.gameState.playState = 'paused';
        break;
      case 'paused':
        this.gameState.playState = 'playing';
        break;
    }
    this.draw();
  }

  tick() {
    if (this.gameState.playState === 'playing') {
      this.dropTetromino();
    }
  }

  clearInterval() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setInterval(interval: number) {
    this.clearInterval();
    this.intervalId = setInterval(
      () => this.tick(),
      interval,
    ) as unknown as number;
  }

  drawBoard() {
    [
      ...this.gameState.board.getBlocks(),
      ...this.gameState.tetromino.blocks,
    ].forEach(block => {
      if (block) {
        const { x, y } = block.pos;
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(
          x * BLOCK_SIZE,
          y * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE,
        );
      }
    });
  }

  drawHardDrop() {
    const tetromino = this.gameState.tetromino.clone();
    while (tetromino.canMove({ x: 0, y: 1 }, this.gameState.board)) {
      tetromino.move({ x: 0, y: 1 });
    }
    tetromino.blocks.forEach(block => {
      const { x, y } = block.pos;
      this.ctx.fillStyle = block.color;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      this.ctx.globalAlpha = 1;
    });
  }

  drawNextTetromino() {
    const tetromino = this.gameState.pool[this.gameState.pool.length - 1];
    tetromino.blocks.forEach(block => {
      const { x, y } = block.pos;
      this.ctx.fillStyle = block.color;
      this.ctx.fillRect(
        x * BLOCK_SIZE + 220,
        y * BLOCK_SIZE + 20,
        BLOCK_SIZE,
        BLOCK_SIZE,
      );
    });
  }

  drawHoldTetromino() {
    if (this.gameState.heldTetromino === null) {
      return;
    }
    this.gameState.heldTetromino.blocks.forEach(block => {
      const { x, y } = block.pos;
      this.ctx.fillStyle = this.gameState.held ? '#888' : block.color;
      this.ctx.fillRect(
        x * BLOCK_SIZE + 300,
        y * BLOCK_SIZE + 20,
        BLOCK_SIZE,
        BLOCK_SIZE,
      );
    });
  }

  drawGrid() {
    this.ctx.strokeStyle = '#fff6';
    this.ctx.beginPath();
    for (let x = 0; x <= this.gameState.board.width; x++) {
      this.ctx.moveTo(x * BLOCK_SIZE, 0);
      this.ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
    }
    for (let y = 0; y <= this.gameState.board.height; y++) {
      this.ctx.moveTo(0, y * BLOCK_SIZE);
      this.ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
    }
    this.ctx.stroke();
  }

  drawScore() {
    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(`Score: ${this.gameState.score}`, 220, 200);
  }

  drawGameOver() {
    this.ctx.font = '40px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Game Over', 20, 200);
  }

  drawPause() {
    this.ctx.font = '40px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Paused', 20, 200);
  }

  drawWaiting() {
    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Press any key to start', 20, 200);
  }

  draw() {
    this.ctx.clearRect(0, 0, 400, 400);
    if (this.gameState.playState === 'waiting') {
      this.drawWaiting();
      return;
    }
    this.drawBoard();
    this.drawNextTetromino();
    this.drawHoldTetromino();
    this.drawHardDrop();
    this.drawScore();
    this.drawGrid();
    switch (this.gameState.playState) {
      case 'gameover':
        this.drawGameOver();
        break;
      case 'paused':
        this.drawPause();
        break;
    }
  }

  initEvents() {
    const keyRepeatDelay = 100; // Delay before key repeat starts (in ms)
    const keyRepeatInterval = 50; // Interval between key repeats (in ms)
    let keyRepeatTimeout: NodeJS.Timeout | null = null;
    let keyRepeatIntervalId: NodeJS.Timeout | null = null;

    const clearKeyRepeat = () => {
      if (keyRepeatTimeout) {
        clearTimeout(keyRepeatTimeout);
        keyRepeatTimeout = null;
      }
      if (keyRepeatIntervalId) {
        clearInterval(keyRepeatIntervalId);
        keyRepeatIntervalId = null;
      }
    };

    const handleKey = (event: KeyboardEvent, repeat = false) => {
      function ce() {
        event.preventDefault();
        event.stopPropagation();
      }
      if (
        (this.gameState.playState === 'waiting' ||
          this.gameState.playState === 'gameover') &&
        !event.repeat
      ) {
        this.startGame();
        ce();
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          this.moveTetromino({ x: -1, y: 0 });
          ce();
          break;
        case 'ArrowRight':
          this.moveTetromino({ x: 1, y: 0 });
          ce();
          break;
        case 'ArrowDown':
          this.dropTetromino(true);
          ce();
          break;
        case 'ArrowUp':
        case 'x':
          ce();
          if (!repeat) this.rotateTetrominoCw();
          break;
        case 'Control':
        case 'z':
          ce();
          if (!repeat) this.rotateTetrominoCcw();
          break;
        case 'Shift':
        case 'c':
          ce();
          if (!repeat) this.holdTetromino();
          break;
        case ' ':
          ce();
          if (!repeat) this.hardDropTetromino();
          break;
        case 'Escape':
          ce();
          if (!repeat) this.pauseGame();
          break;
      }
    };

    window.addEventListener('keydown', event => {
      if (event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      clearKeyRepeat();
      handleKey(event);
      keyRepeatTimeout = setTimeout(() => {
        keyRepeatIntervalId = setInterval(
          () => handleKey(event, true),
          keyRepeatInterval,
        );
      }, keyRepeatDelay);
    });

    window.addEventListener('keyup', () => {
      clearKeyRepeat();
    });
  }

  start() {
    this.initEvents();
    this.draw();
  }
}

export default createCanvasComponent(
  { width: 400, height: 400, className: 'mx-auto' },
  canvas => {
    const tetris = new Tetris(canvas);
    tetris.start();
  },
);
