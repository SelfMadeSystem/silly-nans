import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useImage } from '../utils/canvas/useImage';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { Vector2 } from '../utils/vec';
import dropSrc from './drop.png';
import imageSrc from './image.png';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

class Drop {
  ogPos: Vector2 = new Vector2(0);
  prevPos: Vector2 = new Vector2(0);
  position: Vector2 = new Vector2(0);
  size: number = 0;
  opacity: number = 0;
  speed: Vector2 = new Vector2(0);
  done: boolean = false;

  constructor(canvasSize: Vector2) {
    this.reset(canvasSize);
  }

  reset(canvasSize: Vector2) {
    this.size = Math.random() * 0.8;
    if (this.size < 0.3) {
      this.position = new Vector2(
        Math.random() * canvasSize.x,
        Math.random() * canvasSize.y * 0.9, // top 90% of the canvas height
      );
    } else {
      this.position = new Vector2(
        Math.random() * canvasSize.x,
        Math.random() * canvasSize.y * 0.1, // top 10% of the canvas height
      );
    }
    this.prevPos = this.position;
    this.ogPos = this.position;
    this.opacity = 0.2 + Math.random() * 0.5;
    this.speed = new Vector2(2.5 - Math.random() * 5, 5 + Math.random() * 10);
  }

  update(dt: number, canvasSize: Vector2) {
    this.prevPos = this.position;
    this.position = this.position.add(this.speed.mult(dt));

    if (Math.random() < 0.1) {
      this.speed = new Vector2(2.5 - Math.random() * 5, 5 + Math.random() * 10);
    }

    if (this.position.dist(this.ogPos) > 1000 * this.size) {
      this.reset(canvasSize);
    }
  }

  draw(ctx: CanvasRenderingContext2D, dropImg: HTMLImageElement) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(
      this.position.x,
      this.position.y,
      (dropImg.width * this.size) / 2,
      (dropImg.height * this.size) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.prevPos.x, this.prevPos.y);
    ctx.lineTo(this.position.x, this.position.y);
    ctx.lineWidth = dropImg.width * this.size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

const vertexShaderSource = /* glsl */ `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = vec2(a_texCoord.x, 1. - a_texCoord.y);
  }
`;

const fragmentShaderSource = /* glsl */ `
  precision mediump float;

  uniform sampler2D u_image;
  uniform sampler2D u_displacement;
  uniform float u_time;
  varying vec2 v_texCoord;

  void main() {
    // gl_FragColor = texture2D(u_displacement, v_texCoord);
    vec3 displacement = texture2D(u_displacement, v_texCoord).rga;
    displacement = (displacement - 0.5) * 0.5 * displacement.b;
    vec2 uv = v_texCoord + displacement.xy;
    gl_FragColor = texture2D(u_image, uv);
  }
`;

function Rainfall() {
  const dropsRef = useRef<Drop[]>([]);
  const [dropImg] = useImage(dropSrc.src);
  const [imageImg] = useImage(imageSrc.src);
  const [programInfo, setProgramInfo] = useState<twgl.ProgramInfo | null>(null);
  const [gl, canvas, setCanvas] = useCanvas({
    autoResize: true,
    contextId: 'webgl2',
    setup: (gl: WebGL2RenderingContext) => {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const programInfo = twgl.createProgramInfo(gl, [
        vertexShaderSource,
        fragmentShaderSource,
      ]);
      setProgramInfo(programInfo);
    },
    resize(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    },
  });
  // Displacement canvas
  const [dCtx, dCanvas, setDCanvas] = useCanvas({
    autoResize: true,
  });
  const mouseRef = useRef<Vector2 | null>(null);

  useAnimationLoop((_dt, t) => {
    if (!gl || !canvas || !dCtx || !dCanvas || !dropImg || !imageImg) return;
    const drops = dropsRef.current;

    while (drops.length < 1) {
      drops.push(new Drop(new Vector2(dCanvas.width, dCanvas.height)));
    }

    const drawDrop = (pos: Vector2, size: Vector2, opacity: number) => {
      if (!dropImg) return;
      dCtx.save();
      dCtx.globalAlpha = opacity;
      dCtx.drawImage(
        dropImg,
        pos.x - (dropImg.width * size.x) / 2,
        pos.y - (dropImg.height * size.y) / 2,
        dropImg.width * size.x,
        dropImg.height * size.y,
      );
      dCtx.restore();
    };

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * dCanvas.width;
      const y = (Math.random() * dCanvas.height + t * 100) % dCanvas.height;
      const size = new Vector2(Math.random() * 0.2);
      const opacity = 0.2 + Math.random() * 0.5;
      drawDrop(new Vector2(x, y), size, opacity);
    }

    for (const drop of drops) {
      drop.update(_dt, new Vector2(dCanvas.width, dCanvas.height));
      drop.draw(dCtx, dropImg);
    }

    // dropsRef.current = drops.filter(
    //   drop => !drop.done && drop.position.y < dCanvas.height + dropImg.height,
    // );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (programInfo) {
      const arrays = {
        a_position: {
          numComponents: 2,
          data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
        },
        a_texCoord: {
          numComponents: 2,
          data: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
        },
      };
      const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

      const texOptions = {
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      };
      const imageTex = twgl.createTexture(gl, {
        src: imageImg,
        ...texOptions,
      });
      const displacementTex = twgl.createTexture(gl, {
        src: dCanvas,
        ...texOptions,
      });

      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, {
        u_image: imageTex,
        u_displacement: displacementTex,
        u_time: t,
      });
      twgl.drawBufferInfo(gl, bufferInfo);
    }
  });

  useWindowEvent('mousemove', e => {
    if (!dCanvas) return;
    const rect = dCanvas.getBoundingClientRect();
    const mouse = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    mouseRef.current = mouse;
  });

  useWindowEvent('touchmove', e => {
    if (!dCanvas) return;
    const rect = dCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mouse = new Vector2(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
    );
    mouseRef.current = mouse;
  });

  return (
    <>
      <canvas className="fixed inset-0 -z-10 h-full w-full" ref={setCanvas} />
      <canvas
        className="invisible fixed inset-0 -z-10 h-full w-full"
        ref={setDCanvas}
      />
    </>
  );
}

export default function RainfallWrapper() {
  return <Rainfall />;
}
