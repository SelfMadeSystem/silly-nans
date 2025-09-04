import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useImage } from '../utils/canvas/useImage';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { random, wrapNumber } from '../utils/mathUtils';
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
  speed: number = 0;
  angle: number = 0;
  jumped: boolean = false;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  get velocity(): Vector2 {
    return Vector2.fromAngle(this.angle, this.speed);
  }

  constructor(canvasSize: Vector2, options: RainfallOptions) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.position = new Vector2(random(0, canvasSize.x), 0);
    this.reset(canvasSize, options);
  }

  reset(canvasSize: Vector2, options: RainfallOptions) {
    this.size = random(options.minDropSize, options.maxDropSize);
    if (this.size < 0.3) {
      this.position = new Vector2(
        this.position.x,
        random(0, canvasSize.y * 0.9), // top 90% of the canvas height
      );
    } else {
      this.position = new Vector2(
        this.position.x,
        random(0, canvasSize.y * 0.1), // top 10% of the canvas height
      );
    }
    this.prevPos = this.position;
    this.ogPos = this.position;
    this.opacity = random(options.minOpacity, options.maxOpacity);
    this.speed = random(options.minSpeed, options.maxSpeed);
    this.angle =
      options.angleDownward +
      random(-options.angleVariation, options.angleVariation); // ±angleVariation rad around downward direction
  }

  update(dt: number, canvasSize: Vector2, options: RainfallOptions) {
    this.prevPos = this.position;
    this.position = this.position.add(this.velocity.mult(dt));

    const x = wrapNumber(this.position.x, -50, canvasSize.x + 50);
    this.position = new Vector2(x, this.position.y);
    this.jumped = x !== this.prevPos.x;

    if (this.position.y > canvasSize.y + 50) {
      if (random(0, 1) < options.resetProbability)
        this.reset(canvasSize, options);
    } else if (random(0, 1) < options.speedChangeProbability) {
      this.speed = random(options.minSpeed, options.maxSpeed);
      this.angle =
        options.angleDownward +
        random(-options.angleVariation, options.angleVariation); // ±angleVariation rad around downward direction
    }
  }

  draw(
    rCtx: CanvasRenderingContext2D,
    dCtx: CanvasRenderingContext2D,
    dropImg: HTMLImageElement,
  ) {
    if (!this.ctx || !this.canvas) return;
    this.canvas.width = rCtx.canvas.width;
    this.canvas.height = rCtx.canvas.height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    // this.ctx.globalAlpha = this.opacity;
    this.ctx.drawImage(
      dropImg,
      this.position.x - (dropImg.width * this.size) / 2,
      this.position.y - (dropImg.height * this.size) / 2,
      dropImg.width * this.size,
      dropImg.height * this.size,
    );
    this.ctx.restore();

    this.clearRain(rCtx, dropImg);

    dCtx.drawImage(this.canvas, 0, 0);
  }

  private clearRain(ctx: CanvasRenderingContext2D, dropImg: HTMLImageElement) {
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
    if (!this.jumped) {
      ctx.beginPath();
      ctx.moveTo(this.prevPos.x, this.prevPos.y);
      ctx.lineTo(this.position.x, this.position.y);
      ctx.lineWidth = dropImg.width * this.size;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
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
  uniform float u_displacementStrength;
  varying vec2 v_texCoord;

  void main() {
    // gl_FragColor = texture2D(u_displacement, v_texCoord);
    vec3 displacement = texture2D(u_displacement, v_texCoord).rga;
    displacement = (displacement - 0.5) * u_displacementStrength * displacement.b;
    vec2 uv = v_texCoord + displacement.xy;
    gl_FragColor = texture2D(u_image, uv);
  }
`;

const defaultOptions = {
  dropCount: 20,
  smallRainCount: 20,
  minDropSize: 0.0,
  maxDropSize: 0.8,
  minSpeed: 1.0,
  maxSpeed: 2.0,
  minOpacity: 0.2,
  maxOpacity: 0.7,
  angleVariation: Math.PI / 12,
  angleDownward: Math.PI / 2,
  displacementStrength: 0.5,
  smallRainMinSize: 0.0,
  smallRainMaxSize: 0.2,
  resetProbability: 0.01,
  speedChangeProbability: 0.1,
};

type RainfallOptions = typeof defaultOptions;

function Rainfall({ options }: { options: RainfallOptions }) {
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
  // Rain (small) canvas
  const [rCtx, rCanvas, setRCanvas] = useCanvas({
    autoResize: true,
  });
  // Displacement canvas
  const [dCtx, dCanvas, setDCanvas] = useCanvas({
    autoResize: true,
  });
  const mouseRef = useRef<Vector2 | null>(null);

  useAnimationLoop((_dt, t) => {
    if (
      !gl ||
      !canvas ||
      !rCtx ||
      !rCanvas ||
      !dCtx ||
      !dCanvas ||
      !dropImg ||
      !imageImg
    )
      return;
    const drops = dropsRef.current;

    while (drops.length < options.dropCount) {
      drops.push(new Drop(new Vector2(dCanvas.width, dCanvas.height), options));
    }
    while (drops.length > options.dropCount) {
      drops.pop();
    }

    const drawDrop = (pos: Vector2, size: Vector2, opacity: number) => {
      if (!dropImg) return;
      rCtx.save();
      rCtx.globalAlpha = opacity;
      rCtx.drawImage(
        dropImg,
        pos.x - (dropImg.width * size.x) / 2,
        pos.y - (dropImg.height * size.y) / 2,
        dropImg.width * size.x,
        dropImg.height * size.y,
      );
      rCtx.restore();
    };

    for (let i = 0; i < options.smallRainCount; i++) {
      const x = random(0, dCanvas.width);
      const y = random(0, dCanvas.height);
      const size = new Vector2(
        random(options.smallRainMinSize, options.smallRainMaxSize),
      );
      const opacity = random(options.minOpacity, options.maxOpacity);
      drawDrop(new Vector2(x, y), size, opacity);
    }

    dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
    dCtx.drawImage(rCanvas, 0, 0);

    for (const drop of drops) {
      drop.update(_dt, new Vector2(dCanvas.width, dCanvas.height), options);
      drop.draw(rCtx, dCtx, dropImg);
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
        u_displacementStrength: options.displacementStrength,
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
        ref={setRCanvas}
      />
      <canvas
        className="invisible fixed inset-0 -z-10 h-full w-full"
        ref={setDCanvas}
      />
    </>
  );
}

export default function RainfallWrapper() {
  const [options] = useState<RainfallOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const dropsFolder = pane.addFolder({
        title: 'Drops',
        expanded: true,
      });
      dropsFolder.addBinding(options, 'dropCount', {
        min: 0,
        max: 100,
        step: 1,
      });
      dropsFolder.addBinding(options, 'minDropSize', {
        min: 0,
        max: 2,
        step: 0.1,
      });
      dropsFolder.addBinding(options, 'maxDropSize', {
        min: 0,
        max: 2,
        step: 0.1,
      });
    }

    {
      const motionFolder = pane.addFolder({
        title: 'Motion',
        expanded: true,
      });
      motionFolder.addBinding(options, 'minSpeed', {
        min: 0.1,
        max: 10,
        step: 0.1,
      });
      motionFolder.addBinding(options, 'maxSpeed', {
        min: 0.1,
        max: 10,
        step: 0.1,
      });
      motionFolder.addBinding(options, 'angleVariation', {
        min: 0,
        max: Math.PI / 2,
        step: 0.01,
        format: (v: number) => (v * (180 / Math.PI)).toFixed(1) + '°',
      });
      motionFolder.addBinding(options, 'angleDownward', {
        min: 0,
        max: Math.PI,
        step: 0.01,
        format: (v: number) => (v * (180 / Math.PI)).toFixed(1) + '°',
      });
    }

    {
      const rainFolder = pane.addFolder({
        title: 'Background Rain',
        expanded: false,
      });
      rainFolder.addBinding(options, 'smallRainCount', {
        min: 0,
        max: 200,
        step: 1,
      });
      rainFolder.addBinding(options, 'smallRainMinSize', {
        min: 0,
        max: 1,
        step: 0.01,
      });
      rainFolder.addBinding(options, 'smallRainMaxSize', {
        min: 0,
        max: 1,
        step: 0.01,
      });
    }

    {
      const appearanceFolder = pane.addFolder({
        title: 'Appearance',
        expanded: false,
      });
      appearanceFolder.addBinding(options, 'minOpacity', {
        min: 0,
        max: 1,
        step: 0.01,
      });
      appearanceFolder.addBinding(options, 'maxOpacity', {
        min: 0,
        max: 1,
        step: 0.01,
      });
      appearanceFolder.addBinding(options, 'displacementStrength', {
        min: 0,
        max: 2,
        step: 0.01,
      });
    }

    {
      const behaviorFolder = pane.addFolder({
        title: 'Behavior',
        expanded: false,
      });
      behaviorFolder.addBinding(options, 'resetProbability', {
        min: 0,
        max: 0.1,
        step: 0.001,
      });
      behaviorFolder.addBinding(options, 'speedChangeProbability', {
        min: 0,
        max: 1,
        step: 0.01,
      });
    }

    {
      const presetsFolder = pane.addFolder({
        title: 'Presets',
        expanded: false,
      });
      presetsFolder.addButton({ title: 'Default' }).on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Heavy Rain' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          dropCount: 50,
          smallRainCount: 80,
          maxDropSize: 0.8,
          minSpeed: 1.0,
          maxSpeed: 3.0,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Light Drizzle' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          dropCount: 10,
          smallRainCount: 30,
          maxDropSize: 0.4,
          maxOpacity: 0.4,
          minSpeed: 0.5,
          maxSpeed: 1.5,
        });
        pane.refresh();
      });
      presetsFolder
        .addButton({ title: 'Heavy Slanting Rain' })
        .on('click', () => {
          Object.assign(options, {
            ...defaultOptions,
            dropCount: 75,
            smallRainCount: 180,
            maxDropSize: 0.8,
            minSpeed: 2.0,
            maxSpeed: 4.0,
            angleDownward: (3 * Math.PI) / 4,
            angleVariation: Math.PI / 12,
          });
          pane.refresh();
        });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <Rainfall options={options} />;
}
