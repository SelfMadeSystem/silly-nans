import { isInView } from '../utils/mathUtils';
import { useEffect, useRef } from 'react';

const vertexShaderSource = /*glsl*/ `
  attribute vec4 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position.xy * 0.5 + 0.5;
    gl_Position = a_position;
  }
`;

/**
 * GLSL fragment shader that renders the fade effect
 */
const fadeShaderSource = /*glsl*/ `
  precision mediump float;
  uniform sampler2D u_prevTexture;
  uniform sampler2D u_nextTexture;
  varying vec2 v_uv;
  void main() {
    vec4 prevColor = texture2D(u_prevTexture, v_uv);
    prevColor = floor(prevColor * 255.0 * 0.96) / 255.0;
    vec4 nextColor = texture2D(u_nextTexture, v_uv);
    gl_FragColor = max(nextColor, prevColor);
  }
`;

/**
 * GLSL shader canvas that draws a frame, then fades it out
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
export function FadeShaderCanvas({
  source,
  ...props
}: {
  source: React.RefObject<HTMLCanvasElement | OffscreenCanvas>;
} & React.HTMLProps<HTMLCanvasElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const inViewRef = useRef<boolean>(false);
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Enable blending and set blending function
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
      console.error('Unable to create vertex shader');
      return;
    }
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fadeShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fadeShader) {
      console.error('Unable to create fragment shader');
      return;
    }
    gl.shaderSource(fadeShader, fadeShaderSource);
    gl.compileShader(fadeShader);

    const fadeShaderProgram = gl.createProgram();
    if (!fadeShaderProgram) {
      console.error('Unable to create shader program');
      return;
    }
    gl.attachShader(fadeShaderProgram, vertexShader);
    gl.attachShader(fadeShaderProgram, fadeShader);
    gl.linkProgram(fadeShaderProgram);

    if (!gl.getProgramParameter(fadeShaderProgram, gl.LINK_STATUS)) {
      console.error(
        'Unable to initialize the fade shader program',
        gl.getProgramInfoLog(fadeShaderProgram),
        'Vertex shader:',
        gl.getShaderInfoLog(vertexShader),
        'Fragment shader:',
        gl.getShaderInfoLog(fadeShader),
      );
      return;
    }

    // Set up the rectangle vertices
    const vertices = new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(
      fadeShaderProgram,
      'a_position',
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Create a textures for the fade effect
    const textures: [WebGLTexture, WebGLTexture, WebGLTexture] = [
      gl.createTexture()!,
      gl.createTexture()!,
      gl.createTexture()!,
    ];
    for (const texture of textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // Framebuffer for the fade effect
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    // Get the location of the uniforms
    const prevTextureLocation = gl.getUniformLocation(
      fadeShaderProgram,
      'u_prevTexture',
    );
    const nextTextureLocation = gl.getUniformLocation(
      fadeShaderProgram,
      'u_nextTexture',
    );

    // Resize the canvas
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        if (source.current) {
          source.current.width = displayWidth;
          source.current.height = displayHeight;
        }
        widthRef.current = displayWidth;
        heightRef.current = displayHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Resize the textures
        for (const texture of textures) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          );
        }
      }
    };

    resizeCanvas();

    // Render loop
    const render = () => {
      if (!inViewRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      // Plan of action:
      // 1. Draw the source canvas to texture 0
      // 2. Pass texture 0 and texture 1 to the fade shader
      // 3. Render the fade shader to texture 2
      // 4. Render texture 2 to the screen
      // 5. Swap textures 1 and 2

      // Draw the source canvas to texture 0
      if (source.current) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          textures[0],
          0,
        );
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, textures[0]);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source.current,
        );
      }

      // Pass texture 0 and texture 1 to the fade shader
      gl.useProgram(fadeShaderProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.uniform1i(nextTextureLocation, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[1]);
      gl.uniform1i(prevTextureLocation, 1);

      // Draw to texture 2
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures[2],
        0,
      );
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Draw texture 2 to the screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, textures[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Swap textures 1 and 2
      [textures[1], textures[2]] = [textures[2], textures[1]];

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const start = () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
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
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} {...props} />;
}
