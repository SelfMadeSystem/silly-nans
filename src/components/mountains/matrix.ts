import { Vector2, Vector3 } from "./vec";

type FixedLengthArray<T, L, A extends T[] = []> = 
  A['length'] extends L ? A : FixedLengthArray<T, L, [...A, T]>;

export type ProjectionMatrix = FixedLengthArray<number, 16>;

export function perspective(fov: number, aspect: number, near: number, far: number): ProjectionMatrix {
  const f = 1 / Math.tan(fov / 2);
  const x = f / aspect;
  const y = f;
  const z = (far + near) / (near - far);
  const w = (2 * far * near) / (near - far);

  return [
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, -1,
    0, 0, w, 0,
  ];
}
