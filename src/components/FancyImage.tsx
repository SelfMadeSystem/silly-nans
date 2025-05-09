import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/canvas/useAnimationLoop';
import { useCanvas } from '../utils/canvas/useCanvas';
import { useWindowEvent } from '../utils/canvas/useWindowEvent';
import { clamp } from '../utils/mathUtils';
import { useSpringValue } from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';

export interface FancyImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Vertex shader that passes texture coordinates to fragment shader
const vertexShaderSource = /*glsl*/ `
  attribute vec4 position;
  attribute vec2 texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = position;
    v_texcoord = texcoord;
  }
`;

// Fragment shader that samples from the texture with proper aspect ratio handling
const fragmentShaderSource = /*glsl*/ `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec2 u_imageSize;
  uniform float u_scrollSpeed;

  vec2 rescaleTexCoords(vec2 texCoord, vec2 imageSize, vec2 resolution) {
    // Rescale texture coordinates to scaled to image size
    float xRatio = resolution.x / imageSize.x;
    float yRatio = resolution.y / imageSize.y;

    texCoord.x *= xRatio;
    texCoord.y *= yRatio;

    // Center the image in the canvas
    texCoord.x += (1.0 - xRatio) / 2.0;
    texCoord.y += (1.0 - yRatio) / 2.0;
    return texCoord;
  }

  vec2 transformTexCoords(vec2 texCoord, float scrollSpeed) {
    // Closer to the vertical center line, the more the image is distorted
    float distFromCenter = abs(texCoord.x - 0.5);
    float distortion = 0.5 - pow(distFromCenter - 0.1, 2.0) * 5.0;
    float scrollOffset = distortion * scrollSpeed;
    texCoord.y += scrollOffset;
    return texCoord;
  }

  vec4 getColor(vec2 texCoord) {
    // If out of bounds, return black with -1 alpha
    if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
      return vec4(0.0, 0.0, 0.0, -1.0);
    }
    // Sample the texture with the transformed coordinates
    return texture2D(u_texture, texCoord);
  }

  vec4 getColor(vec2 rTex, vec2 gTex, vec2 bTex) {
    vec4 rColor = getColor(rTex);
    vec4 gColor = getColor(gTex);
    vec4 bColor = getColor(bTex);
    
    float r = rColor.r;
    float g = gColor.g;
    float b = bColor.b;

    // Set channels to 1.0 if out of bounds because the background is white
    if (rColor.a < 0.0) {
      r = 1.0;
    }
    if (gColor.a < 0.0) {
      g = 1.0;
    }
    if (bColor.a < 0.0) {
      b = 1.0;
    }

    // Return the color with the alpha channel
    return vec4(r, g, b, 1.0);
  }
  
  void main() {
    vec2 texCoord = rescaleTexCoords(v_texcoord, u_imageSize, u_resolution);
    float diff = 0.7;
    vec2 rTexCoord = transformTexCoords(texCoord, u_scrollSpeed * diff);
    vec2 gTexCoord = transformTexCoords(texCoord, u_scrollSpeed);
    vec2 bTexCoord = transformTexCoords(texCoord, u_scrollSpeed / diff);
    
    // Discard fragments if all coords outside the [0,1] range
    if ((rTexCoord.x < 0.0 && gTexCoord.x < 0.0 && bTexCoord.x < 0.0) ||
        (rTexCoord.x > 1.0 && gTexCoord.x > 1.0 && bTexCoord.x > 1.0) ||
        (rTexCoord.y < 0.0 && gTexCoord.y < 0.0 && bTexCoord.y < 0.0) ||
        (rTexCoord.y > 1.0 && gTexCoord.y > 1.0 && bTexCoord.y > 1.0)) {
      discard;
    }
    
    // Get the color from the three channels
    vec4 color = getColor(rTexCoord, gTexCoord, bTexCoord);
    // Set the fragment color
    gl_FragColor = vec4(color.rgb, 1.0);
  }
`;

export default function FancyImage({ src, alt, className }: FancyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const programInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const bufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const springScrollY = useSpringValue(scrollY, {
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  const [gl, , setCanvas] = useCanvas({
    contextId: 'webgl',
    autoResize: true,
    contextAttributes: {
      alpha: true, // Enable alpha channel
      antialias: true,
    },
    resize(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      if (!gl) return;

      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    setup(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
      if (!gl) return;

      // Enable alpha in context (usually default, but can be explicit)
      gl.clearColor(0, 0, 0, 0); // Transparent background

      // Enable blending for alpha
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Create shader program
      programInfoRef.current = twgl.createProgramInfo(gl, [
        vertexShaderSource,
        fragmentShaderSource,
      ]);

      // Create a unit quad that fills the entire clip space
      const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        texcoord: [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
      };
      bufferInfoRef.current = twgl.createBufferInfoFromArrays(gl, arrays);
    },
  });

  // Animation render function
  const render = useAnimationLoop((dt, t) => {
    if (
      !gl ||
      !programInfoRef.current ||
      !bufferInfoRef.current ||
      !textureRef.current ||
      !imgRef.current
    )
      return;

    const canvas = gl.canvas as HTMLCanvasElement;

    gl.useProgram(programInfoRef.current.program);
    twgl.setBuffersAndAttributes(
      gl,
      programInfoRef.current,
      bufferInfoRef.current,
    );

    const scrollDiff = springScrollY.get() - scrollY;

    const uniforms = {
      u_texture: textureRef.current,
      u_resolution: [canvas.width, canvas.height],
      u_imageSize: [imgRef.current.width, imgRef.current.height],
      u_scrollSpeed: clamp(scrollDiff / 1000, -0.25, 0.25),
    };

    twgl.setUniforms(programInfoRef.current, uniforms);
    twgl.drawBufferInfo(gl, bufferInfoRef.current, gl.TRIANGLES);
  });

  useEffect(() => {
    if (!gl || !imgRef.current) return;
    setScrollY(window.scrollY);
    springScrollY.set(window.scrollY);

    const loadTexture = () => {
      if (!gl || !imgRef.current || !bufferInfoRef.current) return;

      // Create and set up texture
      textureRef.current = twgl.createTexture(gl, {
        src: imgRef.current,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
    };

    if (imgRef.current.complete) {
      loadTexture();
    } else {
      imgRef.current.onload = loadTexture;
    }

    return () => {
      // Clean up texture
      if (gl && textureRef.current) {
        gl.deleteTexture(textureRef.current);
      }
    };
  }, [gl, src, render, springScrollY]);

  useWindowEvent('scroll', () => {
    setScrollY(window.scrollY);
    springScrollY.start(window.scrollY);
  });

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-full w-full opacity-0"
      />
      <canvas
        ref={setCanvas}
        className="pointer-events-none absolute inset-x-[-200px] inset-y-[-200px] h-[calc(100%+400px)] w-[calc(100%+400px)]"
      />
    </div>
  );
}
