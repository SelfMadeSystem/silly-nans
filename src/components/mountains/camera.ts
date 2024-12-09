import { Vector2, Vector3 } from './vec';

export class Camera {
  constructor(
    public position: Vector3,
    public rotation: Vector3,
    public fx: number,
    public fy: number,
    public cx: number,
    public cy: number,
  ) {}

  transformPoint(point: Vector3): Vector3 {
    const [x, y, z] = [point.x, point.y, point.z];
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    const cosZ = Math.cos(this.rotation.z);
    const sinZ = Math.sin(this.rotation.z);

    const x1 = x * cosZ - y * sinZ;
    const y1 = x * sinZ + y * cosZ;
    const z1 = z;

    const x2 = x1 * cosY + z1 * sinY;
    const y2 = y1;
    const z2 = -x1 * sinY + z1 * cosY;

    const x3 = x2;
    const y3 = y2 * cosX - z2 * sinX;
    const z3 = y2 * sinX + z2 * cosX;

    return new Vector3(x3 - this.position.x, y3 - this.position.y, z3 - this.position.z);
  }

  projectPoint(point: Vector3): Vector2 | null {
    point = this.transformPoint(point);
    const [x, y, z] = [point.x, point.y, point.z];

    // Check if the point is behind the camera
    if (z <= 0) {
      return null; // Point is not in view
    }

    const u = (this.fx * x) / z + this.cx;
    const v = (this.fy * y) / z + this.cy;

    // Optionally, you can add checks to see if (u, v) are within image boundaries
    // if (u < 0 || u > imageWidth || v < 0 || v > imageHeight) {
    //     return null; // Point is outside the image boundaries
    // }

    return new Vector2(u, v);
  }

  projectLine(start: Vector3, end: Vector3): [Vector2 | null, Vector2 | null] {
    const start2D = this.projectPoint(start);
    const end2D = this.projectPoint(end);
    return [start2D, end2D];
  }
}
