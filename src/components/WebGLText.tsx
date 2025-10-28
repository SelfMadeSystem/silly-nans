import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { Vector2 } from '../utils/vec';
import { useRef } from 'react';

const TEXT = `\
Proident do ex qui eu ad anim esse irure. Non mollit pariatur exercitation
commodo amet est ex. Eiusmod eu sunt labore ad consequat magna. In ad voluptate
irure tempor eu enim reprehenderit. Incididunt eu laboris id irure id magna.
Deserunt do et ea quis in et. Adipisicing aute labore aliquip id fugiat ullamco
qui velit id officia. Voluptate nostrud cupidatat laborum aute dolor duis quis
minim velit. Nostrud voluptate culpa laboris reprehenderit commodo eu mollit.`;

function textButRandom() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]{}<>?/|\\`~!@#$%^&*()-_=+';
  let result = '';
  for (let i = 0; i < TEXT.length; i++) {
    const t = TEXT[i];
    if (t.trim() === '') {
      result += t;
    } else {
      const randIndex = Math.floor(Math.random() * chars.length);
      result += chars[randIndex];
    }
  }
  return result;
}

const FONT = '24px monospace';

function getLineHeight(font: string) {
  const fontSize = parseInt(FONT, 10) || 16;
  const lineHeight = Math.ceil(fontSize * 1.2);
  return lineHeight;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
) {
  const lines = text.split('\n');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = FONT;
  context.textAlign = 'left';
  // use top baseline so we can control vertical centering precisely
  context.textBaseline = 'top';
  context.fillStyle = 'black';

  const lineHeight = getLineHeight(FONT);

  const totalHeight = lines.length * lineHeight;
  const startY = canvas.height / 2 - totalHeight / 2;
  const centerX = canvas.width / 2;

  let maxWidth = 0;
  for (const line of lines) {
    const metrics = context.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * lineHeight;
    context.fillText(line, centerX - maxWidth / 2, y);
  }
}

function WebGLText() {
  const charOffsetRef = useRef<Vector2>(new Vector2(0, -4));
  const charSizeRef = useRef<Vector2>(new Vector2(0, 0));

  const [gl, glCanvas, setCanvas] = useCanvas<'webgl'>({
    contextId: 'webgl',
    autoResize: true,
    setup: (gl, canvas) => {
      // Basic WebGL setup
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    },
  });
  const [textCtx, textCanvas, setTextCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize(context, canvas) {
      // only need to draw to this once
      drawTextLines(context, canvas, TEXT);
      // measure character size
      context.font = FONT;
      const metrics = context.measureText('M');
      const width = metrics.width;
      const height = getLineHeight(FONT);
      charSizeRef.current = new Vector2(width, height);
    },
  });
  const [randCtx, randCanvas, setRandCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
  });

  const pointer = usePointerPosition(glCanvas);

  useAnimationLoop(() => {
    if (
      !gl ||
      !textCtx ||
      !randCtx ||
      !textCanvas ||
      !randCanvas ||
      !glCanvas
    ) {
      return;
    }

    // draw random text for the rand canvas (centered, multiline-capable)
    drawTextLines(randCtx, randCanvas, textButRandom());

    // Now draw to WebGL canvas
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const textTex = twgl.createTexture(gl, {
      src: textCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });
    const randTex = twgl.createTexture(gl, {
      src: randCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });

    const programInfo = twgl.createProgramInfo(gl, [
      /* glsl */ `
        attribute vec4 position;
        attribute vec2 texcoord;
        varying vec2 v_texcoord;
        void main() {
          gl_Position = position;
          v_texcoord = texcoord;
        }
      `,
      /* glsl */
      `
        precision mediump float;
        varying vec2 v_texcoord;
        uniform sampler2D textTex;
        uniform sampler2D randTex;
        uniform float time;
        uniform vec2 pointerPos;
        uniform vec2 resolution;
        uniform vec2 charSize;
        uniform vec2 charOffset;

        vec2 getCharPos(vec2 uv) {
          // Calculate character grid position
          vec2 fragCoord = uv * resolution;
          vec2 charIndex = floor((fragCoord - charOffset) / charSize);
          vec2 charUV = (charIndex * charSize) / resolution;
          return charUV;
        }

        void main() {
          // Draw randTex if close to pointer, else textTex
          vec2 uv = v_texcoord;
          vec2 fragCoord = getCharPos(uv) * resolution;
          float distToPointer = distance(fragCoord, pointerPos);
          float threshold = 100.0;
          vec4 color;
          if (distToPointer < threshold) {
            color = texture2D(randTex, uv);
            // color = mix(vec4(1.0, 0.0, 0.0, 1.0), texture2D(randTex, uv), 0.5);
          } else {
            color = texture2D(textTex, uv);
          }
          gl_FragColor = color;
        }
      `,
    ]);
    const arrays = {
      position: {
        numComponents: 2,
        // prettier-ignore
        data: [
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ],
      },
      texcoord: {
        numComponents: 2,
        // prettier-ignore
        data: [
          0, 1,
          1, 1,
          0, 0,
          0, 0,
          1, 1,
          1, 0,
        ],
      },
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, {
      textTex: textTex,
      randTex: randTex,
      time: performance.now() * 0.001,
      pointerPos: pointer ? [pointer.x, pointer.y] : [-1000, -1000],
      resolution: [glCanvas.width, glCanvas.height],
      charSize: charSizeRef.current.a,
      charOffset: charOffsetRef.current.a,
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    // Clean up
    gl.deleteTexture(textTex);
    gl.deleteTexture(randTex);
  });

  return (
    <>
      <canvas
        ref={setTextCanvas}
        className="pointer-events-none invisible absolute inset-0 h-full w-full"
      />
      <canvas
        ref={setRandCanvas}
        className="pointer-events-none invisible absolute inset-0 h-full w-full"
      />
      <canvas
        ref={setCanvas}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </>
  );
}

export default function WebGLTextWrapper() {
  return <WebGLText />;
}
