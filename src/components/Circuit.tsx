import type { CSSProperties } from "react";
import "./Circuit.css";

type Vec2 = [number, number];

const directions: Vec2[] = [
  [1, 1],
  [1, 0],
  [1, -1],
  [0, 1],
  [0, -1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

type Circuit = {
  paths: Vec2[][];
  width: number;
  height: number;
};

export function generateCircuit(width: number, height: number): Circuit {
  const circuit: Vec2[][] = [];
  const visited: number[][] = [];
  let visitedCount = 0;
  const maxVisited = width * height;

  const isInvalid = (pos: Vec2, direction: Vec2, prevDirection: Vec2) => {
    const [x, y] = pos;
    const [dx, dy] = direction;
    const [nx, ny] = [x + dx, y + dy];
    if (
      nx < 0 ||
      nx >= width ||
      ny < 0 ||
      ny >= height ||
      visited[nx][ny] !== -1
    ) {
      return true;
    }

    if (dx === 0 && dy === 0) {
      return false;
    }

    if (
      visited[x + dx][y] === visited[x][y + dy] &&
      visited[x + dx][y] !== -1
    ) {
      return true;
    }

    if (
      Math.abs(direction[0]) === Math.abs(prevDirection[1]) &&
      Math.abs(direction[1]) === Math.abs(prevDirection[0])
    ) {
      return true;
    }

    if (pos[0] < width / 2 && direction[0] === 1) {
      return true;
    }

    if (pos[0] >= width / 2 && direction[0] === -1) {
      return true;
    }

    if (pos[1] < height / 2 && direction[1] === 1) {
      return true;
    }

    if (pos[1] >= height / 2 && direction[1] === -1) {
      return true;
    }

    return false;
  };

  for (let i = 0; i < width; i++) {
    visited[i] = [];
    for (let j = 0; j < height; j++) {
      visited[i][j] = -1;
    }
  }

  const center: Vec2 = [Math.floor(width / 2), Math.floor(height / 2)];

  const findStart = (): Vec2 => {
    if (visited[center[0]][center[1]] === -1) {
      return center;
    }

    // Radially search for a start point
    for (let r = 1; r < Math.max(width, height); r++) {
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          const x = center[0] + i;
          const y = center[1] + j;
          if (x < 0 || x >= width || y < 0 || y >= height) {
            continue;
          }

          if (visited[x][y] === -1) {
            return [x, y];
          }
        }
      }
    }

    return center;
  };

  while (visitedCount < maxVisited) {
    const i = circuit.length;
    // Prefer to start from the center
    const start: Vec2 = findStart();
    if (visited[start[0]][start[1]] !== -1) {
      continue;
    }
    visited[start[0]][start[1]] = i;
    visitedCount++;

    const path: Vec2[] = [start];
    let current = start;
    let next: Vec2;
    let prevDirection: Vec2 = [0, 0];

    while (true) {
      const possibleDirections = directions.filter((direction) => {
        return !isInvalid(current, direction, prevDirection);
      });

      if (possibleDirections.length === 0) {
        break;
      }

      const dir =
        possibleDirections[
          Math.floor(Math.random() * possibleDirections.length)
        ];

      next = [current[0] + dir[0], current[1] + dir[1]];
      prevDirection = dir;
      visited[next[0]][next[1]] = i;
      visitedCount++;
      path.push(next);
      current = next;
    }

    if (path.length > 3) {
      circuit.push(path);
    } else {
      for (const pos of path) {
        visited[pos[0]][pos[1]] = -1;
      }
      visited[start[0]][start[1]] = -2;
    }
  }

  return {
    paths: circuit,
    width,
    height,
  };
}

export function circutToPaths(
  circuit: Circuit,
  size: number
): {
  path: string;
  startDist: number;
  timing: number;
}[] {
  return circuit.paths.map((path) => {
    const [startX, startY] = path[0];
    let pathString = `M${startX * size},${startY * size}`;
    for (let i = 1; i < path.length; i++) {
      const [x, y] = path[i];
      pathString += `L${x * size},${y * size}`;
    }
    const startDist = Math.hypot(
      startX - circuit.width / 2,
      startY - circuit.height / 2
    );
    return { path: pathString, startDist, timing: Math.random() * 5000 + 4000 };
  });
}


function Circuit({
  width = 40,
  height = 20,
  size = 15,
}: {
  width?: number;
  height?: number;
  size?: number;
}) {
  const circuit = generateCircuit(width + 1, height + 1);
  const paths = circutToPaths(circuit, size);
  return (
    <div style={{ width: width * size, height: height * size }}>
      <svg className="svg overflow-visible" width={width * size} height={height * size}>
        {paths.map((path, i) => (
          <g
            key={i}
            style={
              {
                "--start-dist": path.startDist,
                "--timing": `${path.timing}ms`,
              } as CSSProperties
            }
          >
            <path className="not-animated1" d={path.path} />
            <path className="not-animated2" d={path.path} />
            <path className="animated" d={path.path} />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default Circuit;
