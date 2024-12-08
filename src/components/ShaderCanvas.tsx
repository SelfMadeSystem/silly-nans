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
 * GLSL fragment shader that renders the fanciness
 */
const fancyShaderSource = /*glsl*/ `\
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  varying vec2 v_uv;

  const float PI = 3.14159265358979323846;

  // Saw wrap a number between [0, 1]
  float sawWrap(float n) {
    return abs(fract(n) * 2.0 - 1.0);
  }

  // Saw wrap a vector between [0, 1]
  vec2 sawWrap2(vec2 n) {
    return abs(fract(n) * 2.0 - 1.0);
  }

  // Random number generator
  float random(float n) {
    return fract(sin(n) * 43758.5453);
  }

  // Random vec generator
  vec2 random2(float n) {
    return fract(sin(vec2(n, n * 0.1)) * vec2(43758.5453, 22578.145));
  }

  // Random rotation vector in uv space with respect to the resolution
  vec2 random2Normalized(float n) {
    return normalize(random2(n)) / normalize(u_resolution);
  }

  // Move points around the screen bouncing from [0, 1]
  vec2 movePoint(vec2 point, float time, float n) {
    vec2 direction = random2Normalized(n);
    const float minSpeed = 0.01;
    const float maxSpeed = 0.1;
    float speed = random(n) * (maxSpeed - minSpeed) + minSpeed;

    vec2 offset = direction * speed * time;

    return sawWrap2(point + offset);
  }

  // Converts uv coordinates to a point in the screen
  vec2 uvToPoint(vec2 uv) {
    return uv * u_resolution;
  }

  // Gets the screen distance between two uv points
  float screenDistance(vec2 start, vec2 end) {
    return distance(uvToPoint(start), uvToPoint(end));
  }

  // HSV to RGB conversion
  vec3 hcl2rgb(float h, float c, float l) {
    float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
    vec3 rgb;
    if (h < 60.0) {
      rgb = vec3(c, x, 0.0);
    } else if (h < 120.0) {
      rgb = vec3(x, c, 0.0);
    } else if (h < 180.0) {
      rgb = vec3(0.0, c, x);
    } else if (h < 240.0) {
      rgb = vec3(0.0, x, c);
    } else if (h < 300.0) {
      rgb = vec3(x, 0.0, c);
    } else {
      rgb = vec3(c, 0.0, x);
    }
    return rgb + l - c;
  }

  void main() {
    const int numPoints = 50;
    vec3 colors[numPoints];
    vec2 points[numPoints];
    for (int i = 0; i < numPoints; i++) {
      float f = float(i);
      points[i] = random2(f);
      points[i] = movePoint(points[i], u_time, f);
      colors[i] = hcl2rgb(f * 360.0 / float(numPoints), 1.0, 1.0);
    }

    for (int i = 0; i < numPoints; i++) {
      vec3 color = colors[i];
      vec2 point = points[i];
      point = uvToPoint(point);
      float radius = 5.0;
      float shadowRadius = 50.0;
      
      float dist = distance(gl_FragCoord.xy, point);

      if (dist < radius) {
        gl_FragColor += vec4(color, 1.0);
      } else if (dist < radius + shadowRadius) {
        float alpha = 1.0 - (dist - radius) / shadowRadius;
        gl_FragColor.rgb += color * alpha * (1.0 - gl_FragColor.a);
        gl_FragColor.a += alpha * (1.0 - gl_FragColor.a);
      }
    }
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
    prevColor = floor(prevColor * 255.0 * 0.99) / 255.0;
    vec4 nextColor = texture2D(u_nextTexture, v_uv);
    gl_FragColor = max(nextColor, prevColor);
  }
`;

/**
 * GLSL shader canvas that draws a frame, then fades it out
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
const ShaderCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const inViewRef = useRef<boolean>(false);
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
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

    const fancyShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fancyShader) {
      console.error('Unable to create fragment shader');
      return;
    }
    gl.shaderSource(fancyShader, fancyShaderSource);
    gl.compileShader(fancyShader);

    const fadeShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fadeShader) {
      console.error('Unable to create fragment shader');
      return;
    }
    gl.shaderSource(fadeShader, fadeShaderSource);
    gl.compileShader(fadeShader);

    // Link shaders to create a program
    const fancyShaderProgram = gl.createProgram();
    if (!fancyShaderProgram) {
      console.error('Unable to create shader program');
      return;
    }
    gl.attachShader(fancyShaderProgram, vertexShader);
    gl.attachShader(fancyShaderProgram, fancyShader);
    gl.linkProgram(fancyShaderProgram);

    if (!gl.getProgramParameter(fancyShaderProgram, gl.LINK_STATUS)) {
      console.error(
        'Unable to initialize the fancy shader program',
        gl.getProgramInfoLog(fancyShaderProgram),
        'Vertex shader:',
        gl.getShaderInfoLog(vertexShader),
        'Fragment shader:',
        gl.getShaderInfoLog(fancyShader),
      );
      return;
    }

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

    gl.useProgram(fancyShaderProgram);

    // Set up the rectangle vertices
    const vertices = new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(
      fancyShaderProgram,
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
    const resolutionLocation = gl.getUniformLocation(
      fancyShaderProgram,
      'u_resolution',
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
      const now = performance.now() / 1000;
      // Plan of action:
      // 1. Render the fanciness to texture 0
      // 2. Pass texture 0 and texture 1 to the fade shader
      // 3. Render the fade shader to texture 2
      // 4. Render texture 2 to the screen
      // 5. Swap textures 1 and 2

      // Render the fancy shader to texture 0
      gl.useProgram(fancyShaderProgram);
      gl.uniform2fv(resolutionLocation, [
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
      ]);
      gl.uniform1f(gl.getUniformLocation(fancyShaderProgram, 'u_time'), now + 200);

      // Draw to texture 0
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures[0],
        0,
      );
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default ShaderCanvas;
