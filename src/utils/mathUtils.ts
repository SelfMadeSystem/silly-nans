/**
 * Most of these functions were taken from:
 *
 * https://github.com/SelfMadeSystem/Portfolio/blob/main/src/utils/MathUtils.ts
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */

export type Vec2 = [number, number];

/**
 * Modulo function that always returns a positive number
 * @param a The number to be modulated
 * @param n The number to modulate by
 * @returns The modulated number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * The same as Math.random() but with a min and max
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between a min and max
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random integer
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

/**
 * Produces a random number between a min and max with a logarithmic distribution
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random number with a logarithmic distribution
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomLog(min: number, max: number): number {
  return Math.pow(Math.random(), 2) * (max - min) + min;
}

/**
 * Returns true or false randomly, depending on the probability
 * @param probability The probability of returning true
 * @returns True or false randomly, depending on the probability
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Returns a random ID with a given length
 * @param length The length of the ID
 * @returns The random ID with the given length
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-27
 */
export function randomId(length = 8): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Loops a number between a min and max
 * @param at The number to loop
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The looped number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function wrapNumber(at: number, min: number, max: number): number {
  return mod(at - min, max - min) + min;
}

/**
 * Wraps an angle between -180 and 180
 * @param angle The angle to wrap
 * @returns The wrapped angle between -180 and 180
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function wrapAngle(angle: number): number {
  return wrapNumber(angle, -180, 180);
}

/**
 * Clamps a number between a min and max
 * @param at The number to clamp
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The clamped number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function clamp(at: number, min: number, max: number): number {
  return Math.min(Math.max(at, min), max);
}

/**
 * Linearly interpolates between two numbers
 * @param a The first number
 * @param b The second number
 * @param t The interpolation value
 * @returns The interpolated number between a and b at t
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-08
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linearly interpolates between two points
 * @param a The first point
 * @param b The second point
 * @param t The interpolation value
 * @returns The interpolated point between a and b at t
 */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

/**
 * Greater common divisor of two numbers using iteration
 * @param a The first number
 * @param b The second number
 * @returns The greater common divisor of a and b
 */
export function gcd(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Calculates a point on a bezier curve
 * @param a The first point
 * @param b The second point
 * @param c The third point
 * @param d The fourth point
 * @param t The interpolation value
 * @returns The point on the bezier curve at t
 * @see https://en.wikipedia.org/wiki/B%C3%A9zier_curve
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-08
 */
export function bezier(a: Vec2, b: Vec2, c: Vec2, d: Vec2, t: number): Vec2 {
  return lerpVec2(
    lerpVec2(lerpVec2(a, b, t), lerpVec2(b, c, t), t),
    lerpVec2(lerpVec2(b, c, t), lerpVec2(c, d, t), t),
    t,
  );
}

/**
 * Determines if an element is in view.
 * @param element The element to check
 * @param dist The distance from the edge of the screen to check
 * @returns True if the element is in view, false otherwise
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
export function isInView(element: HTMLElement, dist = 0): boolean {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  const width = window.innerWidth || document.documentElement.clientWidth;
  return rect.bottom >= -dist && rect.right >= -dist && rect.top <= height + dist && rect.left <= width + dist;
}
