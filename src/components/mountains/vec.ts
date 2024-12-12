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

  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
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

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}

export class Vector2 {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const length = this.length();
    return new Vector2(this.x / length, this.y / length);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
