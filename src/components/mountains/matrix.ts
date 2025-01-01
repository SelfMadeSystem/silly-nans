import { Vector3 } from '../../utils/vec';

// prettier-ignore
type Matrix3x3Array = [
  number, number, number,
  number, number, number,
  number, number, number,
];

export class Matrix3x3 {
  constructor(public elements: Matrix3x3Array) {}

  multiply(other: Vector3): Vector3 {
    const [a, b, c, d, e, f, g, h, i] = this.elements;
    const { x, y, z } = other;
    return new Vector3(
      a * x + b * y + c * z,
      d * x + e * y + f * z,
      g * x + h * y + i * z,
    );
  }
}
