import { useEffect, useRef } from "react";
import { isInView, mod } from "../utils/mathUtils";
import useHexThing, { type HexThingOptions, defaultOpts } from "./useHexThing";

const vertexShaderSource = /*glsl*/ `
  attribute vec4 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position.xy * 0.5 + 0.5;
    gl_Position = a_position;
  }
`;

const fragmentShaderSource = /*glsl*/ `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_uv;
  void main() {
    vec4 texColor = texture2D(u_texture, vec2(v_uv.x, 1.0 - v_uv.y));
    if (texColor.a < 0.1) discard;
    gl_FragColor = texColor;
  }
`;

/**
 * GLSL shader canvas whose sole purpose is to remove not-quite-transparent pixels
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
const ShaderCanvas = (opts: Partial<HexThingOptions>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const inViewRef = useRef<boolean>(false);
  const offsetY = useRef(0);
  const offsetX = useRef(0);
  const matrixRef = useHexThing({
    inView: inViewRef,
    offsetY,
    offsetX,
    ...opts,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Enable blending and set blending function
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
      console.error("Unable to create vertex shader");
      return;
    }
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      console.error("Unable to create fragment shader");
      return;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Link shaders to create a program
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
      console.error("Unable to create shader program");
      return;
    }
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error(
        "Unable to initialize the shader program:",
        gl.getProgramInfoLog(shaderProgram),
        "Vertex shader:",
        gl.getShaderInfoLog(vertexShader),
        "Fragment shader:",
        gl.getShaderInfoLog(fragmentShader),
      );
      return;
    }

    gl.useProgram(shaderProgram);

    // Set up the rectangle vertices
    const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Resize the canvas
    const resizeCanvas = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        if (matrixRef.current) {
          matrixRef.current.width = displayWidth;
          matrixRef.current.height = displayHeight;
        }
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }

      const rect = canvas.getBoundingClientRect();
      offsetX.current = -mod(rect.left + window.scrollX + rect.width * (opts.cx ?? defaultOpts.cx), 50 * 1.5);
      offsetY.current = -mod(rect.top + window.scrollY + rect.height * (opts.cy ?? defaultOpts.cy), 50 * 0.866025404);
    };

    resizeCanvas();

    // Create a texture from the 2D canvas
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Get the location of the texture uniform
    const textureLocation = gl.getUniformLocation(shaderProgram, "u_texture");

    // Render loop
    const render = () => {
      if (!matrixRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, matrixRef.current);

      // Set the texture uniform
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureLocation, 0);

      // Draw the rectangle
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const start = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      render();
    };

    const handleResize = () => {
      resizeCanvas();
      start();
    };

    const handleScroll = () => {
      inViewRef.current = isInView(canvas);
    };

    handleScroll();

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default ShaderCanvas;
