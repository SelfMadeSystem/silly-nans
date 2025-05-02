import { mod } from './mathUtils';

export class Vector3 {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) {}

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  getZ(): number {
    return this.z;
  }

  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  add2(other: Vector2): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z);
  }

  sub(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  sub2(other: Vector2): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z);
  }

  mult(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  mult3(other: Vector3): Vector3 {
    return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
  }

  divide(scalar: number): Vector3 {
    return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3 {
    const length = this.length();
    return new Vector3(this.x / length, this.y / length, this.z / length);
  }

  dot(other: Vector3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  abs(): Vector3 {
    return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
  }

  rotateBy(rotation: Vector3): Vector3 {
    // Apply rotation around the X axis
    let cos = Math.cos(rotation.x);
    let sin = Math.sin(rotation.x);
    const point = {
      x: this.x,
      y: this.y,
      z: this.z,
    };
    let y = point.y * cos - point.z * sin;
    let z = point.y * sin + point.z * cos;
    point.y = y;
    point.z = z;

    // Apply rotation around the Y axis
    cos = Math.cos(rotation.y);
    sin = Math.sin(rotation.y);
    let x = point.x * cos + point.z * sin;
    z = -point.x * sin + point.z * cos;
    point.x = x;
    point.z = z;

    // Apply rotation around the Z axis
    cos = Math.cos(rotation.z);
    sin = Math.sin(rotation.z);
    x = point.x * cos - point.y * sin;
    y = point.x * sin + point.y * cos;
    point.x = x;
    point.y = y;

    return new Vector3(point.x, point.y, point.z);
  }

  xy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}

export class Vector2 {
  public readonly x: number;
  public readonly y: number;

  constructor(
    ...args: [number] | [number, number] | [{ x: number; y: number }]
  ) {
    if (args[0] instanceof Object) {
      this.x = args[0].x;
      this.y = args[0].y;
      return;
    }

    this.x = args[0];
    this.y = args[1] ?? args[0];
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude,
    );
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  mult(x: number | Vector2, y?: number): Vector2 {
    if (x instanceof Vector2) {
      return new Vector2(this.x * x.x, this.y * x.y);
    }
    return new Vector2(this.x * x, this.y * (y ?? x));
  }

  div(x: number | Vector2, y?: number): Vector2 {
    if (x instanceof Vector2) {
      return new Vector2(this.x / x.x, this.y / x.y);
    }
    return new Vector2(this.x / x, this.y / (y ?? x));
  }

  mod(other: Vector2): Vector2 {
    return new Vector2(mod(this.x, other.x), mod(this.y, other.y));
  }

  directionTo(other: Vector2): Vector2 {
    return other.sub(this).normalize();
  }

  isNaN(): boolean {
    return isNaN(this.x) || isNaN(this.y);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  setLength(length: number): Vector2 {
    return this.normalize().mult(length);
  }

  lenSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const length = this.length();
    return new Vector2(this.x / length, this.y / length);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  rotate(rotation: number): Vector2 {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  cw90(): Vector2 {
    return new Vector2(this.y, -this.x);
  }

  ccw90(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  setMag(magnitude: number): Vector2 {
    return this.normalize().mult(magnitude);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  dist(other: Vector2): number {
    return this.sub(other).length();
  }

  distSq(other: Vector2): number {
    return this.sub(other).lenSq();
  }

  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  isPerpendicular(other: Vector2): boolean {
    return this.dot(other) === 0;
  }

  isParallel(other: Vector2): boolean {
    return this.cross(other) === 0;
  }

  angleTo(other: Vector2): number {
    return other.sub(this).angle();
  }

  lerp(other: Vector2, amount: number): Vector2 {
    return this.add(other.sub(this).mult(amount));
  }

  avg(other: Vector2) {
    return this.add(other).mult(0.5);
  }

  swap(): Vector2 {
    return new Vector2(this.y, this.x);
  }

  abs(): Vector2 {
    return new Vector2(Math.abs(this.x), Math.abs(this.y));
  }

  sign(): Vector2 {
    return new Vector2(Math.sign(this.x), Math.sign(this.y));
  }

  to3(z: number = 0): Vector3 {
    return new Vector3(this.x, this.y, z);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  get a(): [number, number] {
    return [this.x, this.y];
  }
}

const PI = Math.PI;
const TWO_PI = Math.PI * 2;

/**
 * Constrain the vector to be at a certain range of the anchor
 */
export function constrainDistance(
  pos: Vector2,
  anchor: Vector2,
  constraint: number,
): Vector2 {
  return anchor.add(pos.sub(anchor).setMag(constraint));
}

/**
 * Constrain two vectors to be at a certain range from each other
 *
 * Makes sure the amount it changes is equal for both vectors
 */
export function constrainDistanceBoth(
  a: Vector2,
  b: Vector2,
  constraint: number,
): [vecA: Vector2, vecB: Vector2] {
  const avg = a.add(b).mult(0.5);
  const vecA = a.sub(avg).setMag(constraint / 2);
  const vecB = b.sub(avg).setMag(constraint / 2);
  return [vecA.add(avg), vecB.add(avg)];
}

/**
 * Constrain the angle to be within a certain range of the anchor
 */
export function constrainAngle(
  angle: number,
  anchor: number,
  constraint: number,
) {
  if (Math.abs(relativeAngleDiff(angle, anchor)) <= constraint) {
    return simplifyAngle(angle);
  }

  if (relativeAngleDiff(angle, anchor) > constraint) {
    return simplifyAngle(anchor - constraint);
  }

  return simplifyAngle(anchor + constraint);
}

/**
 * i.e. How many radians do you need to turn the angle to match the anchor?
 */
export function relativeAngleDiff(angle: number, anchor: number) {
  // Since angles are represented by values in [0, 2pi), it's helpful to rotate
  // the coordinate space such that PI is at the anchor. That way we don't have
  // to worry about the "seam" between 0 and 2pi.
  angle = simplifyAngle(angle + PI - anchor);
  anchor = PI;

  return anchor - angle;
}

/**
 * Simplify the angle to be in the range [0, 2pi)
 */
export function simplifyAngle(angle: number) {
  while (angle >= TWO_PI) {
    angle -= TWO_PI;
  }

  while (angle < 0) {
    angle += TWO_PI;
  }

  return angle;
}
