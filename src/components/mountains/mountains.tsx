// Synthwave mountains generator
import { random, randomInt } from '../../utils/mathUtils';
import { Camera } from './camera';
import { Vector2, Vector3 } from './vec';

export const width = 21;
export const depth = 42;
export const maxHeight = 20;
export const minHeight = 15;
export const cellWidth = 400;
export const cellHeight = 400;
export const cellDepth = 1;
export const screenWidth = width * 40;
export const screenHeight = maxHeight * 40;

const focalX = 1;
const focalY = 1;

export class MountainArray {
  private data: number[][];
  public camera: Camera;

  constructor() {
    this.data = Array.from({ length: depth }, () =>
      Array.from({ length: width }),
    );

    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        this.data[z][x] = z === 0 ? 0 : 0;
      }
    }

    this.camera = new Camera(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0),
      focalX,
      focalY,
      screenWidth / 2,
      screenHeight / 2,
    );
  }

  get(x: number, z: number): number {
    if (x < 0 || x >= width || z < 0 || z >= depth) {
      throw new Error('Index out of bounds');
    }
    return this.data[z][x];
  }

  set(x: number, z: number, value: number): void {
    this.data[z][x] = value;
  }

  generate() {
    for (let ox = 0; ox < width; ox += 2) {
      const oz = randomInt(2, depth - 1);
      const y = getPeakHeight(oz);
      const mountainSpread = Math.floor(y / 2);

      for (let i = -mountainSpread; i <= mountainSpread; i++) {
        for (let j = -mountainSpread; j <= mountainSpread; j++) {
          let x = ox + i;
          let z = oz + j;

          if (x < 0) {
            x += width;
          }
          if (x >= width) {
            x -= width;
          }
          if (z < 0) {
            z += depth;
          }
          if (z >= depth) {
            z -= depth;
          }

          const distance = i * i + j * j;
          if (distance > mountainSpread * mountainSpread) {
            continue;
          }
          const drop = Math.pow(
            distance / (mountainSpread * mountainSpread),
            0.25,
          );
          const height = y - Math.floor(drop * y);
          const value = Math.max(this.get(x, z), height);

          this.set(x, z, value);
        }
      }
    }
  }

  getPolys(): [Vector2, Vector2, Vector2, Vector2][] {
    const lines: [Vector2, Vector2, Vector2, Vector2][][] = [];
    const hw = width / 2;

    for (let z = depth - 1; z >= 0; z--) {
      for (let x = 0; x < width; x++) {
        // closer to center x it gets, the lower the y
        const y1Mult = Math.pow(Math.abs(x - hw) / hw, 1.2);
        const y2Mult = Math.pow(Math.abs(x + 1 - hw) / hw, 1.2);
        const x1 = (x - hw) * cellWidth;
        const y1 = screenHeight - this.get(x, z) * cellHeight * y1Mult;
        let z1 = (z + 4) * cellDepth;
        const x2 = (x + 1 - hw) * cellWidth;
        const y2 =
          screenHeight - this.get((x + 1) % width, z) * cellHeight * y2Mult;
        let z2 = z1;
        const x3 = x2;
        const y3 =
          screenHeight -
          this.get((x + 1) % width, (z + 1) % depth) * cellHeight * y2Mult;
        let z3 = (z + 5) * cellDepth;
        const x4 = x1;
        const y4 =
          screenHeight - this.get(x, (z + 1) % depth) * cellHeight * y1Mult;
        let z4 = z3;

        let i = 0;
        while (z3 < this.camera.position.z) {
          z1 += depth * cellDepth;
          z2 += depth * cellDepth;
          z3 += depth * cellDepth;
          z4 += depth * cellDepth;
          i++;
        }

        const tl = this.camera.projectPoint(new Vector3(x1, y1, z1));
        const tr = this.camera.projectPoint(new Vector3(x2, y2, z2));
        const br = this.camera.projectPoint(new Vector3(x3, y3, z3));
        const bl = this.camera.projectPoint(new Vector3(x4, y4, z4));

        if (!tl || !tr || !bl || !br) {
          continue;
        }

        if (!lines[i]) {
          lines[i] = [];
        }

        lines[i].push([tl, tr, br, bl]);
      }
    }

    return lines.toReversed().flat().filter(Boolean);
  }

  toSvg(): JSX.Element {
    const polygons = [];

    const polys = this.getPolys();

    for (const polygon of polys) {
      const points = polygon.map(v => `${v.x},${v.y}`).join(' ');
      polygons.push(
        <polygon className="mountain-bg" key={`${points}`} points={points} />,
      );
    }

    return (
      <svg
        width={screenWidth}
        height={screenHeight}
        className="svg mountain"
        xmlns="http://www.w3.org/2000/svg"
      >
        {polygons}
      </svg>
    );
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';

    const polys = this.getPolys();

    for (const polygon of polys) {
      ctx.beginPath();
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x, polygon[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPeakHeight = (_z: number): number => {
  return random(minHeight, maxHeight);
  // const maxPeak = Math.pow(z / depth, 0.75) * maxHeight;
  // const minPeak = z / depth * maxHeight;

  // return randomInt(minPeak, maxPeak);
};
