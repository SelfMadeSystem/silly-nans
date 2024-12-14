import { Camera } from './camera';
import { Matrix3x3 as Matrix3 } from './matrix';
import { Vector2, Vector3 } from './vec';

export const screenWidth = 800;
export const screenHeight = 600;

/**
 * A bezier curve with 4 control points
 */
class BezierCurve {
  private controlPoints: Vector3[];

  constructor(controlPoints: Vector3[]) {
    this.controlPoints = controlPoints;
  }

  /**
   * Get the point on the curve at time t
   */
  getPoint(t: number): Vector3 {
    const p0 = this.controlPoints[0];
    const p1 = this.controlPoints[1];
    const p2 = this.controlPoints[2];
    const p3 = this.controlPoints[3];

    const a = p0.multiply(Math.pow(1 - t, 3));
    const b = p1.multiply(3 * Math.pow(1 - t, 2) * t);
    const c = p2.multiply(3 * (1 - t) * Math.pow(t, 2));
    const d = p3.multiply(Math.pow(t, 3));

    return a.add(b).add(c).add(d);
  }

  /**
   * Get the tangent to the curve at time t
   */
  getTangent(t: number): Vector3 {
    const p0 = this.controlPoints[0];
    const p1 = this.controlPoints[1];
    const p2 = this.controlPoints[2];
    const p3 = this.controlPoints[3];

    const a = p1.subtract(p0).multiply(3 * Math.pow(1 - t, 2));
    const b = p2.subtract(p1).multiply(6 * (1 - t) * t);
    const c = p3.subtract(p2).multiply(3 * Math.pow(t, 2));

    return a.add(b).add(c).normalize();
  }

  /**
   * Gets n points on the curve
   */
  getPoints(n: number): Vector3[] {
    const points = [];
    n--;
    for (let i = 0; i <= n; i++) {
      points.push(this.getPoint(i / n));
    }
    return points;
  }

  /**
   * Rotates all points around the Z axis by the given angle
   */
  rotateZ(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.controlPoints = this.controlPoints.map(
      v => new Vector3(v.x * cos - v.y * sin, v.x * sin + v.y * cos, v.z),
    );
  }

  clone(): BezierCurve {
    return new BezierCurve(this.controlPoints.map(p => p.clone()));
  }
}

export class Polygon {
  private vertices: Vector3[];

  /**
   * Creates a regular polygon with the given number of sides
   */
  constructor(sides: number, radius: number) {
    this.vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      this.vertices.push(new Vector3(x, y, 0));
    }
  }

  /**
   * Gets the vertices of the polygon
   */
  getVertices(): Vector3[] {
    return this.vertices;
  }

  /**
   * Moves the polygon by the given vector
   */
  move(vector: Vector3) {
    this.vertices = this.vertices.map(v => v.add(vector));
  }

  /**
   * Rotates the polygon around the Z axis by the given angle.
   */
  rotateZ(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.vertices = this.vertices.map(
      v => new Vector3(v.x * cos - v.y * sin, v.x * sin + v.y * cos, 0),
    );
  }

  /**
   * Rotates the polygon so it's facing a certain direction.
   * Assumes the polygon is originally facing the positive Z axis and is in the
   * XY plane.
   *
   * Essentially, if this polygon is a plane, it rotates the plane about the
   * origin so that the normal vector is the given direction.
   */
  rotateToFace(direction: Vector3) {
    direction = direction.normalize();
    const z = new Vector3(0, 0, 1);

    const dotProduct = z.dot(direction);
    const directionLength = direction.length();

    if (dotProduct / (z.length() * directionLength) === 1) {
      // Directions are the same; no rotation needed
      return;
    }

    if (dotProduct / (z.length() * directionLength) === -1) {
      // Directions are opposite; rotate 180 degrees around any perpendicular axis, e.g., X axis
      const axis = new Vector3(1, 0, 0);
      const angle = Math.PI;
      this.rotate(axis, angle);
      return;
    }

    const axis = z.cross(direction).normalize();
    const angle = Math.acos(dotProduct / (z.length() * directionLength));
    this.rotate(axis, angle);
  }

  /**
   * Rotates the polygon about the given axis by the given angle.
   */
  rotate(axis: Vector3, angle: number) {
    axis = axis.normalize();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = axis.x;
    const y = axis.y;
    const z = axis.z;
    const m = new Matrix3([
      cos + x * x * (1 - cos),
      x * y * (1 - cos) - z * sin,
      x * z * (1 - cos) + y * sin,
      y * x * (1 - cos) + z * sin,
      cos + y * y * (1 - cos),
      y * z * (1 - cos) - x * sin,
      z * x * (1 - cos) - y * sin,
      z * y * (1 - cos) + x * sin,
      cos + z * z * (1 - cos),
    ]);
    this.vertices = this.vertices.map(v => m.multiply(v));
  }

  /**
   * Duplicate the polygon
   */
  clone(): Polygon {
    const p = new Polygon(0, 0);
    p.vertices = this.vertices.map(v => v.clone());
    return p;
  }

  /**
   * Moves and rotates the polygon so that it's on the given curve at the given
   * time.
   */
  placeOnCurve(curve: BezierCurve, t: number) {
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    this.rotateToFace(tangent);
    this.move(point);
  }
}

function toPath(points: (Vector2 | null)[]): string {
  if (points.some(p => p === null)) {
    return '';
  }
  return 'M ' + points.map(p => `${p!.x} ${p!.y}`).join(' L ') + ' Z';
}

export class Tunnel {
  public camera: Camera;
  public ogPoly: Polygon;
  public polygons: Polygon[] = [];
  public ogCurve: BezierCurve;
  public curve: BezierCurve;

  constructor(sides: number) {
    this.camera = new Camera(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0),
      400,
      400,
      screenWidth / 2,
      screenHeight / 2,
    );
    this.ogPoly = new Polygon(sides, 1);
    this.ogCurve = new BezierCurve([
      new Vector3(3.5, -2, 4),
      new Vector3(3, -2, 4),
      new Vector3(0, -0, 4),
      new Vector3(0, -0, 0),
    ]);

    this.curve = this.ogCurve.clone();
  }

  /**
   * Gets points on the curve projected onto the screen
   */
  getCurvePoints(n: number): (Vector2 | null)[] {
    const pts = this.curve.getPoints(n);
    return pts.map(v => this.camera.projectPoint(v));
  }

  /**
   * Gets points on the curve as an SVG path
   */
  getCurvePath(n: number): string {
    return toPath(this.getCurvePoints(n));
  }

  /**
   * Gets the polygon points projected onto the screen
   */
  getPolygonPoints(): (Vector2 | null)[][] {
    // return this.ogPoly.getVertices().map(v => this.camera.projectPoint(v));
    return this.polygons.map(p =>
      p.getVertices().map(v => this.camera.projectPoint(v)),
    );
  }

  /**
   * Gets the polygon points as an SVG path
   */
  getPolygonPath(): string[] {
    return this.getPolygonPoints().map(toPath);
  }
}
