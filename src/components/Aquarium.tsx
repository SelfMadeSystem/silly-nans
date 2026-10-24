import { createCanvasEffect } from 'nans-canvas';
import { CanvasEffect } from 'nans-canvas/react';
import {
  DEG2RAD,
  RAD2DEG,
  angleDelta,
  clamp,
  lerp,
  random,
  wrapAngle,
  wrapNumber,
} from 'nans-canvas/utils/mathUtils';
import { Vector2 } from 'nans-canvas/utils/vec';
import { useMemo } from 'react';

function isNeon() {
  return false;
}

if (!('Path2D' in globalThis)) {
  (globalThis as any).Path2D = class {};
}

const FISH_SVG_PATH = new Path2D(
  `M12,20L12.76,17C9.5,16.79 6.59,15.4 5.75,13.58C5.66,14.06 5.53,14.5 5.33,14.83C4.67,16 3.33,16 2,16C3.1,16 3.5,14.43 3.5,12.5C3.5,10.57 3.1,9 2,9C3.33,9 4.67,9 5.33,10.17C5.53,10.5 5.66,10.94 5.75,11.42C6.4,10 8.32,8.85 10.66,8.32L9,5C11,5 13,5 14.33,5.67C15.46,6.23 16.11,7.27 16.69,8.38C19.61,9.08 22,10.66 22,12.5C22,14.38 19.5,16 16.5,16.66C15.67,17.76 14.86,18.78 14.17,19.33C13.33,20 12.67,20 12,20M17,11A1,1 0 0,0 16,12A1,1 0 0,0 17,13A1,1 0 0,0 18,12A1,1 0 0,0 17,11Z`,
);

const fishCanvasCache = new Map<string, HTMLCanvasElement>();

const fishUpscale = 2;

function createColoredFishCanvas(
  color: string,
  fishScale: number,
  neon: boolean,
): HTMLCanvasElement {
  const cacheKey = `${color}-${fishScale}-${neon}`;
  if (fishCanvasCache.has(cacheKey)) {
    return fishCanvasCache.get(cacheKey)!;
  }

  fishScale *= fishUpscale;

  const canvas = document.createElement('canvas');
  canvas.width = 24 * fishScale;
  canvas.height = 24 * fishScale;
  const ctx = canvas.getContext('2d')!;

  ctx.scale(fishScale, fishScale);

  if (neon) {
    ctx.fillStyle = '#242424';
    ctx.fill(FISH_SVG_PATH);
    ctx.strokeStyle = color;
    ctx.lineWidth = (3 / fishScale) * fishUpscale;
    ctx.stroke(FISH_SVG_PATH);
  } else {
    ctx.fillStyle = color;
    ctx.fill(FISH_SVG_PATH);
  }

  fishCanvasCache.set(cacheKey, canvas);
  return canvas;
}

enum PointerClickState {
  NONE,
  CLICKED,
  HELD,
}

/**
 * An interface that can update and render
 */
interface UpdateAndRender {
  update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void;
  draw(ctx: CanvasRenderingContext2D): void;
  moveDiff(diff: Vector2, canvasSize: Vector2): void;
}

/**
 * A base class for all fish.
 */
abstract class BaseFish implements UpdateAndRender {
  abstract getPosition(): Vector2;
  abstract getRotation(): number;
  abstract getSize(): number;
  abstract getColor(): string;

  /**
   * Updates the fish.
   * @param canvasSize The size of the canvas.
   * @param delta The time since the last update in milliseconds.
   * @param pointers The pointers on the canvas and their click state.
   */
  abstract update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void;

  /**
   * Draws the fish to the canvas.
   * @param ctx The canvas context to draw to.
   * @param element The element to get the color from (if 'color' is a variable)
   */
  draw(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.getPosition();
    const rotation = this.getRotation();
    const size = this.getSize();
    const color = this.getColor();

    const neon = isNeon();

    ctx.save();
    ctx.translate(x, y);
    // ctx.scale(size, size);
    ctx.rotate(rotation * DEG2RAD);
    ctx.translate(-12 * size, -12 * size);

    if (neon) {
      const fishNeonCanvas = createColoredFishCanvas(color, size, true);
      ctx.drawImage(
        fishNeonCanvas,
        0,
        0,
        fishNeonCanvas.width / fishUpscale,
        fishNeonCanvas.height / fishUpscale,
      );
    } else {
      const fishFillCanvas = createColoredFishCanvas(color, size, false);
      ctx.drawImage(
        fishFillCanvas,
        0,
        0,
        fishFillCanvas.width / fishUpscale,
        fishFillCanvas.height / fishUpscale,
      );
    }

    ctx.restore();
  }

  abstract moveDiff(diff: Vector2, canvasSize: Vector2): void;
}

/**
 * Standard fish implementation.
 */
class Fish extends BaseFish {
  protected position: Vector2 = new Vector2(0, 0);
  protected rotation: number = 0;
  protected size: number = 3;
  protected speed: number = 0.1;
  protected turnSpeed: number = 0;
  protected maxTurnSpeed: number = 30;
  protected turnAccel: number = 30;
  protected turnTo: number = 0;

  protected normalSpeed: number = 0.1;
  protected normalMaxTurnSpeed: number = 30;
  protected normalTurnAccel: number = 30;

  protected runAwayDistance: number = 300;
  protected runAwaySpeed: number = 0.3;
  protected runAwayMaxTurnSpeed: number = 360;
  protected runAwayTurnAccel: number = 1020;
  protected runAwayFrom: Vector2 = new Vector2(0, 0);
  protected runAwayTime: number = 0;
  protected runAwayDuration: number = 5000;

  protected passedTurnTo: boolean = false;
  constructor(
    protected color: string,
    canvasSize: Vector2,
  ) {
    super();
    this.position = new Vector2(
      random(0, canvasSize.x),
      random(0, canvasSize.y),
    );
    this.turnSpeed = random(-this.maxTurnSpeed, this.maxTurnSpeed);
  }

  getPosition(): Vector2 {
    return this.position;
  }

  getRotation(): number {
    return this.rotation;
  }

  getSize(): number {
    return this.size;
  }

  getColor(): string {
    return this.color;
  }

  moveTo(pos: Vector2, canvasSize: Vector2) {
    this.position = new Vector2(
      wrapNumber(pos.x, -this.size * 12, canvasSize.x + this.size * 12),
      wrapNumber(pos.y, -this.size * 12, canvasSize.y + this.size * 12),
    );
  }

  moveDiff(diff: Vector2, canvasSize: Vector2) {
    this.moveTo(this.position.add(diff), canvasSize);
  }

  move(speed: number, canvasSize: Vector2) {
    const pos = this.position.add(
      Vector2.fromAngle(this.rotation * DEG2RAD, speed),
    );

    this.moveTo(pos, canvasSize);
  }

  rotateTo(angle: number, speed: number) {
    const diff = wrapAngle(angle - this.rotation);
    const absDiff = Math.abs(diff);
    const sign = Math.sign(diff);
    const rotation = Math.min(absDiff, speed) * sign;
    this.rotation += rotation;
    this.rotation = wrapAngle(this.rotation);
  }

  rotate(angle: number) {
    this.rotation += angle;
    this.rotation = wrapAngle(this.rotation);
  }

  /**
   * Rotates the fish to the turnTo angle and moves it forward.
   * @param canvasSize Size of the canvas.
   * @param delta Time since the last update in milliseconds.
   */
  rotateAndMove(canvasSize: Vector2, delta: number) {
    const deltaSeconds = delta / 1000;

    // We want to rotate to the turnTo angle, but we want to do so in a
    // smooth way, like a sine wave.

    const diff = angleDelta(this.rotation, this.turnTo);

    if (diff > 0) {
      this.turnSpeed += this.turnAccel * deltaSeconds;
    } else {
      this.turnSpeed -= this.turnAccel * deltaSeconds;
    }

    this.turnSpeed = clamp(
      this.turnSpeed,
      -this.maxTurnSpeed,
      this.maxTurnSpeed,
    );

    const sign = Math.sign(diff);

    this.rotate(this.turnSpeed * deltaSeconds);

    // If the previous sign is different from the current sign, we've passed
    // the turnTo angle.
    this.passedTurnTo =
      sign != Math.sign(angleDelta(this.rotation, this.turnTo));

    this.move(this.speed * delta, canvasSize);
  }

  update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void {
    for (const pointer of pointers) {
      const [pointerPos, clickState] = pointer;
      // console.log(clickState);
      if (clickState == PointerClickState.CLICKED) {
        // See if the pointer is close enough to the fish to run away
        if (
          pointerPos.distSq(this.position) <
          this.runAwayDistance * this.runAwayDistance
        ) {
          this.runAwayFrom = new Vector2(pointerPos);
          this.runAwayTime = this.runAwayDuration;
        }
      }
    }

    // Run away
    if (this.runAwayTime > 0) {
      this.runAwayTime -= delta;
      this.speed = this.runAwaySpeed;
      this.maxTurnSpeed = this.runAwayMaxTurnSpeed;
      this.turnAccel = this.runAwayTurnAccel;

      if (this.runAwayTime < this.runAwayDuration / 2) {
        const t = Math.max(0, (this.runAwayTime / this.runAwayDuration) * 2);
        this.speed = lerp(this.normalSpeed, this.runAwaySpeed, t);
        this.maxTurnSpeed = lerp(
          this.normalMaxTurnSpeed,
          this.runAwayMaxTurnSpeed,
          t,
        );
        this.turnAccel = lerp(this.normalTurnAccel, this.runAwayTurnAccel, t);
      }
    }

    this.rotateAndMove(canvasSize, delta);

    if (this.runAwayTime > 0) {
      this.turnTo = wrapAngle(
        this.position.angleTo(this.runAwayFrom) * RAD2DEG + 180,
      );
    }
  }

  // override draw(ctx: CanvasRenderingContext2D, element: HTMLElement): void {
  //     super.draw(ctx, element);

  //     if (this.runAwayTime > 0) {
  //         ctx.strokeStyle = "red";
  //         ctx.beginPath();
  //         ctx.moveTo(this.position.x, this.position.y);
  //         ctx.lineTo(this.runAwayFrom.x, this.runAwayFrom.y);
  //         ctx.stroke();
  //     }
  // }
}

/**
 * Basic fish that swims around and runs away if the mouse clicks on it.
 * Also randomly decides to run away for no apparent reason.
 * Loops around the canvas.
 */
class BasicFish extends Fish {
  protected normalTurnTo: number = 0;
  protected normalTurnToRange: number = 15;

  protected randomRunAwayDuration: number = 5000;
  protected randomRunAwayTime: number = 0; // time until next random run away
  protected randomRunAwayInterval: number = 120000; // time between random run aways
  protected randomRunAwayIntervalRange: number = 60000; // range of time between random run aways

  protected passedTurnTo: boolean = false;
  constructor(color: string, canvasSize: Vector2) {
    super(color, canvasSize);
    this.normalTurnTo = Math.random() * 360 - 180;
    this.rotation = Math.random() * 360 - 180;
    this.turnTo =
      this.normalTurnTo +
      (Math.random() > 0.5 ? 1 : -1) * this.normalTurnToRange;

    this.randomRunAwayTime = Math.random() * this.randomRunAwayInterval;
  }

  update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void {
    super.update(canvasSize, delta, pointers);

    if (this.runAwayTime <= 0) {
      this.randomRunAwayTime -= delta;
    }
    if (this.randomRunAwayTime < 0) {
      this.runAwayTime = this.randomRunAwayDuration;
      this.runAwayFrom = new Vector2(this.position);

      this.randomRunAwayTime =
        this.randomRunAwayInterval +
        Math.random() * this.randomRunAwayIntervalRange;
    }

    if (this.passedTurnTo) {
      // If we're not running away, rotate to the normal turnTo angle
      const dist = angleDelta(this.rotation, this.turnTo);

      if (dist < 0) {
        this.turnTo = this.normalTurnTo + this.normalTurnToRange;
      } else {
        this.turnTo = this.normalTurnTo - this.normalTurnToRange;
      }
    }
  }
}

/**
 * Mini fish that is part of a school.
 */
class MiniFish extends Fish {
  protected offset: Vector2;
  protected farSpeed = 0.15;
  protected closeSpeed = 0.07;
  protected farDistance = 750;
  protected closeDistance = 50;
  constructor(
    color: string,
    canvasSize: Vector2,
    public school: School,
  ) {
    super(color, canvasSize);
    this.size = 1;

    this.maxTurnSpeed = this.normalMaxTurnSpeed = 40;
    this.turnAccel = this.normalTurnAccel = 90;

    this.runAwaySpeed = 0.2;
    this.runAwayMaxTurnSpeed = 500;
    this.runAwayTurnAccel = 3000;

    this.offset = Vector2.fromAngle(Math.random() * 360 * DEG2RAD).mult(
      Math.random() * 70 + 35,
    );
    this.position = school.position
      .add(this.offset)
      .sub(Vector2.fromAngle(school.rotation * DEG2RAD).mult(100));

    this.rotation = wrapAngle(school.rotation + Math.random() * 60 - 30);
  }

  override update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void {
    super.update(canvasSize, delta, pointers);

    if (this.runAwayTime <= 0) {
      // Determine which is the shortest path to the school

      const pos = this.school.position.add(this.offset);

      let target = pos;
      let targetDist = this.position.distSq(target);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          const test = pos.add(new Vector2(x * canvasSize.x, y * canvasSize.y));

          const dist = this.position.distSq(test);

          if (dist < targetDist) {
            target = test;
            targetDist = dist;
          }
        }
      }

      this.turnTo = wrapAngle(this.position.angleTo(target) * RAD2DEG);

      const dist = this.position.distSq(target);

      // Set the speed based on how far away we are
      this.speed = clamp(
        lerp(
          this.closeSpeed,
          this.farSpeed,
          dist / (this.farDistance * this.farDistance),
        ),
        this.closeSpeed,
        this.farSpeed,
      );
    }
  }

  // override draw(ctx: CanvasRenderingContext2D, element: HTMLElement): void {
  //     super.draw(ctx, element);

  //     const pos = this.school.position.add(this.offset);

  //     ctx.fillStyle = "green";
  //     ctx.beginPath();
  //     ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
  //     ctx.fill();
  // }
}

/**
 * A school of fish.
 */
class School implements UpdateAndRender {
  public fish: MiniFish[] = [];
  public speed: number = 0.07;
  public position: Vector2;
  public rotation: number = 0;
  public rotationChange: number = 30;

  constructor(
    public size: number,
    color: string,
    canvasSize: Vector2,
  ) {
    this.position = Vector2.randomRange(0, canvasSize);
    this.rotation = Math.random() * 360 - 180;
    this.rotationChange = (Math.random() - 0.5) ** 3 * 50;

    for (let i = 0; i < size; i++) {
      this.fish.push(new MiniFish(color, canvasSize, this));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const fish of this.fish) {
      fish.draw(ctx);
    }

    // ctx.fillStyle = "red";
    // ctx.beginPath();
    // ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);
    // ctx.fill();
  }

  update(
    canvasSize: Vector2,
    delta: number,
    pointers: [Vector2, PointerClickState][],
  ): void {
    const deltaSeconds = delta / 1000;

    for (const fish of this.fish) {
      fish.update(canvasSize, delta, pointers);
    }

    this.position = this.position
      .add(Vector2.fromAngle(this.rotation * DEG2RAD).mult(this.speed * delta))
      .wrap(new Vector2(0, 0), canvasSize);

    // Update the rotation
    this.rotation += this.rotationChange * deltaSeconds;
    this.rotation = wrapAngle(this.rotation);

    if (Math.abs(this.rotationChange) > 0.5) {
      this.rotationChange -= this.rotationChange * 0.1 * deltaSeconds;
    } else {
      this.rotationChange = (Math.random() - 0.5) * 50;
    }
    // console.log(this.rotationChange);
  }

  moveDiff(diff: Vector2, canvasSize: Vector2) {
    this.position = this.position.add(diff).wrap(new Vector2(0, 0), canvasSize);

    for (const fish of this.fish) {
      fish.moveDiff(diff, canvasSize);
    }
  }
}

type PointerState = [pos: Vector2, clickState: PointerClickState];

type AquariumProps = {
  color?: string;
};

const aquariumEffect = createCanvasEffect(
  { contextId: '2d', scrollable: true },
  ({ color = '#fff' }: AquariumProps, ctx) => {
    let canvasSize = new Vector2(
      ctx.canvas.clientWidth,
      ctx.canvas.clientHeight,
    );

    const fishies: UpdateAndRender[] = [];
    for (let i = 0; i < 6; i++) fishies.push(new School(10, color, canvasSize));
    for (let i = 0; i < 25; i++) fishies.push(new BasicFish(color, canvasSize));

    const pointerStates: Map<number, PointerState> = new Map();

    return {
      onResize(size) {
        canvasSize = new Vector2(size.cssWidth, size.cssHeight);
        ctx.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);

        for (const fish of fishies) {
          fish.moveDiff(new Vector2(0, 0), canvasSize);
        }
      },
      onPointerDown(pointer) {
        pointerStates.set(pointer.id, [
          new Vector2(pointer.position.cssPixels),
          PointerClickState.CLICKED,
        ]);
      },
      onPointerMove(pointer) {
        const current = pointerStates.get(pointer.id);
        if (current) {
          current[0] = new Vector2(pointer.position.cssPixels);
        } else {
          pointerStates.set(pointer.id, [
            new Vector2(pointer.position.cssPixels),
            PointerClickState.NONE,
          ]);
        }
      },
      onPointerUp(pointer) {
        const current = pointerStates.get(pointer.id);
        if (current) {
          current[0] = new Vector2(pointer.position.cssPixels);
          if (current[1] !== PointerClickState.CLICKED) {
            current[1] = PointerClickState.NONE;
          }
        }
      },
      onPointerCancel(pointer) {
        pointerStates.delete(pointer.id);
      },
      draw({ ctx, deltaTime, allPointers, pointersDown, scrollDelta }) {
        const activePointers = new Map<number, Vector2>();
        for (const pointer of allPointers) {
          activePointers.set(
            pointer.id,
            new Vector2(pointer.position.cssPixels),
          );
        }
        for (const pointer of pointersDown) {
          activePointers.set(
            pointer.id,
            new Vector2(pointer.position.cssPixels),
          );
        }
        for (const [id, [position, clickState]] of pointerStates) {
          if (
            clickState === PointerClickState.CLICKED &&
            !activePointers.has(id)
          ) {
            activePointers.set(id, position);
          }
        }

        const pointers = [...activePointers].map(
          ([id, position]) =>
            [
              position,
              pointerStates.get(id)?.[1] ?? PointerClickState.NONE,
            ] as [Vector2, PointerClickState],
        );
        const delta = Math.min(deltaTime * 1000, 35);

        for (const fish of fishies) {
          fish.moveDiff(new Vector2(0, -scrollDelta.cssPixels.y), canvasSize);
          fish.update(canvasSize, delta, pointers);
        }

        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);

        for (const fish of fishies) {
          fish.draw(ctx);
        }

        for (const [id, pointer] of pointerStates) {
          if (pointer[1] === PointerClickState.CLICKED) {
            pointer[1] = PointerClickState.HELD;
          } else if (!activePointers.has(id)) {
            pointerStates.delete(id);
          }
        }
      },
    };
  },
);

const Aquarium = ({
  color = '#fff',
  style,
  ...props
}: AquariumProps & React.ComponentPropsWithoutRef<'canvas'>) => {
  const options = useMemo(() => ({ color }), [color]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <CanvasEffect
        effect={aquariumEffect}
        options={options}
        {...props}
        style={{
          position: 'absolute',
          top: '-10vh',
          width: '100%',
          height: '120vh',
          ...style,
        }}
      />
    </div>
  );
};

export default Aquarium;
