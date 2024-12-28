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

const CANVAS_WIDTH = 25;
const CANVAS_HEIGHT = 20;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 23;
const BLOCK_SIZE = 20;
const BOARD_OFFSET_X = 5;
const BOARD_OFFSET_Y = 0;
const NEXT_TETROMINO_OFFSET_X = 17;
const NEXT_TETROMINO_OFFSET_Y = 1;
const HOLD_TETROMINO_OFFSET_X = 1;
const HOLD_TETROMINO_OFFSET_Y = 1;

type PlayState = 'waiting' | 'paused' | 'playing' | 'gameover';

type TetrominoPool = Tetromino[];

type GameState = {
  board: Board;
  tetromino: Tetromino;
  pool: TetrominoPool;
  heldTetromino: Tetromino | null;
  held: boolean;
  playState: PlayState;
  score: number;
  tickInterval: number;
  level: number;
};

const WALL_KICKS: Record<number, Vec2[]> = {
  0: [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  1: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
  2: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  3: [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
};

const I_WALL_KICKS: Record<number, Vec2[]> = {
  0: [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 1 },
    { x: 1, y: -2 },
  ],
  1: [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: -2 },
    { x: 2, y: 1 },
  ],
  2: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: -1 },
    { x: -1, y: 2 },
  ],
  3: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 2 },
    { x: -2, y: -1 },
  ],
};

class Tetromino {
  rotation: number = 0;
  constructor(
    public blocks: Vec2[],
    public color: string,
    public id: string,
    public rotationPoint: Vec2 = { x: 0, y: 0 },
  ) {}

  getBlocks() {
    return this.blocks.map(block => ({
      pos: {
        x: block.x,
        y: block.y,
      },
      color: this.color,
    }));
  }

  wallKicks(rotation: number) {
    return this.id === 'I' ? I_WALL_KICKS[rotation] : WALL_KICKS[rotation];
  }

  move(delta: Vec2) {
    this.blocks.forEach(block => {
      block.x += delta.x;
      block.y += delta.y;
    });
    this.rotationPoint.x += delta.x;
    this.rotationPoint.y += delta.y;
  }

  rotateICw(i: number): Vec2 {
    const { x: cx, y: cy } = this.rotationPoint;
    const x = this.blocks[i].x - cx;
    const y = this.blocks[i].y - cy;
    return { x: cx - y, y: cy + x };
  }

  rotateCw(board: Board): boolean {
    const ogBlocks = this.blocks.map(block => ({ ...block }));
    this.blocks.forEach((block, i) => {
      const { x, y } = this.rotateICw(i);
      block.x = x;
      block.y = y;
    });

    const wallKicks = this.wallKicks(this.rotation);

    for (const kick of wallKicks) {
      if (this.canMove(kick, board)) {
        this.rotation = (this.rotation + 1) % 4;
        this.move(kick);
        return true;
      }
    }

    this.blocks = ogBlocks;
    return false;
  }

  rotateICcw(i: number): Vec2 {
    const { x: cx, y: cy } = this.rotationPoint;
    const x = this.blocks[i].x - cx;
    const y = this.blocks[i].y - cy;
    return { x: cx + y, y: cy - x };
  }

  rotateCcw(board: Board): boolean {
    const ogBlocks = this.blocks.map(block => ({ ...block }));
    this.blocks.forEach((block, i) => {
      const { x, y } = this.rotateICcw(i);
      block.x = x;
      block.y = y;
    });

    const wallKicks = this.wallKicks((this.rotation + 3) % 4).map(kick => ({
      x: -kick.x,
      y: -kick.y,
    }));

    for (const kick of wallKicks) {
      if (this.canMove(kick, board)) {
        this.rotation = (this.rotation + 3) % 4;
        this.move(kick);
        return true;
      }
    }

    this.blocks = ogBlocks;
    return false;
  }

  canMove(delta: Vec2, board: Board) {
    return this.blocks.every(block => {
      const x = block.x + delta.x;
      const y = block.y + delta.y;
      return isBlockValid({ x, y }, board);
    });
  }

  clone() {
    return new Tetromino(
      this.blocks.map(block => ({ ...block })),
      this.color,
      this.id,
      { ...this.rotationPoint },
    );
  }

  reset() {
    return getTetromino(this.id as TetrominoType);
  }
}

const TETROMINOS = {
  I: new Tetromino(
    [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    'cyan',
    'I',
    { x: 0.5, y: 0.5 },
  ),
  J: new Tetromino(
    [
      { x: -1, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    'blue',
    'J',
  ),
  L: new Tetromino(
    [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
    ],
    'orange',
    'L',
  ),
  O: new Tetromino(
    [
      { x: 1, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 0 },
    ],
    'yellow',
    'O',
    { x: 0.5, y: -0.5 },
  ),
  S: new Tetromino(
    [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
    ],
    'green',
    'S',
  ),
  T: new Tetromino(
    [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
    ],
    'purple',
    'T',
  ),
  Z: new Tetromino(
    [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
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
      this.set(block.x, block.y, tetromino.color);
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

function newTetrominoPool(): TetrominoPool {
  const poolSize = 1;

  const keys = [
    ...Array.from({ length: poolSize }, () => TETROMINO_TYPES).flat(),
  ];

  keys.sort(() => Math.random() - 0.5);

  return keys.map(key => getTetromino(key));
}

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

    this.gameState.tetromino.rotateCw(this.gameState.board);
    this.draw();
  }

  rotateTetrominoCcw() {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    this.gameState.tetromino.rotateCcw(this.gameState.board);
    this.draw();
  }

  spawnNewTetromino() {
    this.gameState.tetromino = this.gameState.pool.pop()!;
    if (this.gameState.pool.length < 3) {
      this.gameState.pool.unshift(...newTetrominoPool());
    }
    this.gameState.tetromino.move({
      x: Math.floor(BOARD_WIDTH / 2 - 1),
      y: 3,
    });
    if (!this.gameState.tetromino.canMove({ x: 0, y: 0 }, this.gameState.board)) {
      this.gameState.playState = 'gameover';
    }
    this.gameState.held = false;
    this.draw();
  }

  dropTetromino(key = false) {
    if (this.gameState.playState !== 'playing') {
      return;
    }

    if (key) {
      this.gameState.score += 1;
      this.resetInterval();
    }

    if (this.gameState.tetromino.canMove({ x: 0, y: 1 }, this.gameState.board)) {
      this.gameState.tetromino.move({ x: 0, y: 1 });
      this.draw();
    } else {
      this.gameState.board.setTetromino(this.gameState.tetromino);
      const linesCleared = this.gameState.board.clearLines();
      this.gameState.score +=
        linesCleared === 0 ? 0 : Math.pow(2, linesCleared - 1) * 100 * (Math.floor(this.gameState.level) + 1);
      if (linesCleared > 0) {
        this.gameState.level += linesCleared / 10;
        this.gameState.tickInterval = Math.max(
          100,
          1000 - Math.floor(this.gameState.level) * 100,
        );
        this.setInterval(this.gameState.tickInterval);
      }
      this.spawnNewTetromino();
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
      this.spawnNewTetromino();
    } else {
      const temp = this.gameState.tetromino.reset();
      this.gameState.tetromino = this.gameState.heldTetromino;
      this.gameState.heldTetromino = temp;
      this.gameState.tetromino.move({
        x: Math.floor(BOARD_WIDTH / 2 - 1),
        y: 3,
      });
      this.draw();
    }
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

  resetInterval() {
    this.clearInterval();
    this.setInterval(this.gameState.tickInterval);
  }

  drawBoard() {
    [
      ...this.gameState.board.getBlocks(),
      ...this.gameState.tetromino.getBlocks(),
    ].forEach(block => {
      if (block) {
        const { x, y } = block.pos;
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(
          (x + BOARD_OFFSET_X) * BLOCK_SIZE,
          (y - 3 + BOARD_OFFSET_Y) * BLOCK_SIZE,
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
    this.ctx.fillStyle = tetromino.color;
    this.ctx.globalAlpha = 0.5;
    tetromino.blocks.forEach(({ x, y }) => {
      this.ctx.fillRect(
        (x + BOARD_OFFSET_X) * BLOCK_SIZE,
        (y - 3 + BOARD_OFFSET_Y) * BLOCK_SIZE,
        BLOCK_SIZE,
        BLOCK_SIZE,
      );
    });
    this.ctx.globalAlpha = 1;
  }

  drawNextTetromino(i: number) {
    const tetromino = this.gameState.pool[this.gameState.pool.length - i - 1];
    this.ctx.fillStyle = tetromino.color;
    tetromino.blocks.forEach(({ x, y }) => {
      this.ctx.fillRect(
        (x + NEXT_TETROMINO_OFFSET_X) * BLOCK_SIZE,
        (y + NEXT_TETROMINO_OFFSET_Y + i * 3) * BLOCK_SIZE,
        BLOCK_SIZE,
        BLOCK_SIZE,
      );
    });
  }

  drawNextTetrominos() {
    for (let i = 0; i < 3; i++) {
      this.drawNextTetromino(i);
    }
  }

  drawHoldTetromino() {
    if (this.gameState.heldTetromino === null) {
      return;
    }
    const tetromino = this.gameState.heldTetromino;
    this.ctx.fillStyle = this.gameState.held ? '#888' : tetromino.color;
    tetromino.blocks.forEach(({ x, y }) => {
      this.ctx.fillRect(
        (x + HOLD_TETROMINO_OFFSET_X) * BLOCK_SIZE,
        (y + HOLD_TETROMINO_OFFSET_Y) * BLOCK_SIZE,
        BLOCK_SIZE,
        BLOCK_SIZE,
      );
    });
  }

  drawGrid() {
    this.ctx.strokeStyle = '#fff6';
    this.ctx.beginPath();
    for (let x = 0; x <= this.gameState.board.width; x++) {
      this.ctx.moveTo((x + BOARD_OFFSET_X) * BLOCK_SIZE, BOARD_OFFSET_Y * BLOCK_SIZE);
      this.ctx.lineTo((x + BOARD_OFFSET_X) * BLOCK_SIZE, (BOARD_HEIGHT + BOARD_OFFSET_Y) * BLOCK_SIZE);
    }
    for (let y = 0; y <= this.gameState.board.height; y++) {
      this.ctx.moveTo(BOARD_OFFSET_X * BLOCK_SIZE, (y + BOARD_OFFSET_Y) * BLOCK_SIZE);
      this.ctx.lineTo((BOARD_WIDTH + BOARD_OFFSET_X) * BLOCK_SIZE, (y + BOARD_OFFSET_Y) * BLOCK_SIZE);
    }
    this.ctx.stroke();
  }

  drawScore() {
    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(`Score: ${this.gameState.score}`, NEXT_TETROMINO_OFFSET_X * BLOCK_SIZE, 200);
    this.ctx.fillText(`Level: ${Math.floor(this.gameState.level)}`, NEXT_TETROMINO_OFFSET_X * BLOCK_SIZE, 230);
  }

  drawGameOver() {
    this.ctx.font = '40px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Game Over', BOARD_OFFSET_X * BLOCK_SIZE, 200);
  }

  drawPause() {
    this.ctx.font = '40px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Paused', BOARD_OFFSET_X * BLOCK_SIZE, 200);
  }

  drawWaiting() {
    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Press any key to start', BOARD_OFFSET_X * BLOCK_SIZE, 200);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.gameState.playState === 'waiting') {
      this.drawWaiting();
      return;
    }
    this.drawBoard();
    this.drawNextTetrominos();
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

function initialGameState(): GameState {
  const pool = newTetrominoPool();
  const firstTetromino = pool.pop()!;
  firstTetromino.move({ x: Math.floor(BOARD_WIDTH / 2 - 1), y: 3 });
  return {
    board: new Board(BOARD_WIDTH, BOARD_HEIGHT),
    tetromino: firstTetromino,
    pool,
    heldTetromino: null,
    held: false,
    playState: 'waiting',
    score: 0,
    tickInterval: 1000,
    level: 0,
  };
}

export default createCanvasComponent(
  { width: CANVAS_WIDTH * BLOCK_SIZE, height: CANVAS_HEIGHT * BLOCK_SIZE, className: 'mx-auto' },
  canvas => {
    const tetris = new Tetris(canvas);
    tetris.start();
  },
);
