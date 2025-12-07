import { Vector2 } from '../utils/vec';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  width: 300,
  height: 300,
  rounded: 100,
  bubbleness: 1,
  displacementScale: 1.4,
  beforeBlur: 0.01,
  afterBlur: 2,
};

type LiquidGlassOptions = typeof defaultOptions;

// red: x axis, green: y axis

function getRounded(options: LiquidGlassOptions): number {
  return Math.min(options.width / 2, options.height / 2, options.rounded);
}

/**
 * Gets the distance from the edge of the liquid glass container
 * for a given position. Includes support for rounded corners.
 */
function distanceFromEdge(pos: Vector2, options: LiquidGlassOptions): number {
  const { width, height } = options;
  const rounded = getRounded(options);

  let dx = Math.min(pos.x, width - pos.x);
  let dy = Math.min(pos.y, height - pos.y);

  if (dx < rounded && dy < rounded) {
    dx = Math.max(0, rounded - dx);
    dy = Math.max(0, rounded - dy);
    // Calculate distance from corner
    const cornerDistance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, rounded - cornerDistance);
  }

  return Math.min(dx, dy);
}

/**
 * Determines if a position is inside the rounded rect.
 */
function isInsideRoundedRect(
  pos: Vector2,
  options: LiquidGlassOptions,
): boolean {
  const { width, height } = options;
  const rounded = getRounded(options);

  if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) {
    return false;
  }

  let dx = Math.min(pos.x, width - pos.x);
  let dy = Math.min(pos.y, height - pos.y);
  if (dx < rounded && dy < rounded) {
    // Inside the corner radius area
    dx = Math.max(0, rounded - dx);
    dy = Math.max(0, rounded - dy);
    return Math.sqrt(dx * dx + dy * dy) <= rounded;
  }
  return true;
}

function createDisplacementImage(options: LiquidGlassOptions) {
  const { width, height, bubbleness } = options;

  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = new Vector2(x, y);
      const distance = distanceFromEdge(pos, options);
      const maxDistance = Math.min(options.width / 2, options.height / 2);

      // Calculate displacement based on distance and bubbleness
      const displacement = Math.max(
        0,
        ((maxDistance * bubbleness - distance) / (maxDistance * bubbleness)) *
          255,
      );

      const rx = 0.5 - x / width;
      const ry = 0.5 - y / height;

      const i = (y * width + x) * 4;

      if (!isInsideRoundedRect(pos, options)) {
        data[i] = 255 / 2;
        data[i + 1] = 255 / 2;
        data[i + 2] = 0;
        data[i + 3] = 255;
        continue;
      }

      // Set pixel color based on displacement
      data[i] = 255 / 2 + displacement * rx;
      data[i + 1] = 255 / 2 + displacement * ry;
      // data[i + 2] = displacement;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function LiquidGlass({
  options,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  options: LiquidGlassOptions;
}) {
  const [displacementImage, setDisplacementImage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const image = createDisplacementImage(options);
    setDisplacementImage(image);
  }, [options]);

  const [position, setPosition] = useState<Vector2>(new Vector2(0));
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Vector2>(new Vector2(0));
  const glassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const image = createDisplacementImage(options);
    setDisplacementImage(image);
  }, [options]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (glassRef.current) {
      setIsDragging(true);
      const rect = glassRef.current.getBoundingClientRect();
      setDragOffset(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (glassRef.current && e.touches.length > 0) {
      setIsDragging(true);
      const rect = glassRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      setDragOffset(
        new Vector2(touch.clientX - rect.left, touch.clientY - rect.top),
      );
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition(
          new Vector2(e.clientX - dragOffset.x, e.clientY - dragOffset.y),
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        const touch = e.touches[0];
        setPosition(
          new Vector2(
            touch.clientX - dragOffset.x,
            touch.clientY - dragOffset.y,
          ),
        );
        // Prevent scrolling while dragging
        e.preventDefault();
      }
    };

    // Add global mouse and touch event listeners when dragging
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={glassRef}
      {...props}
      className={`fixed z-100 translate-3d cursor-move overflow-hidden rounded-none ${props.className || ''}`}
      style={{
        ...props.style,
        width: options.width,
        height: options.height,
        backdropFilter: `url(#liquidglass-displacement) blur(${options.afterBlur}px)`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        borderRadius: options.rounded,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {displacementImage && (
        <>
          <svg
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
            }}
            xmlns="http://www.w3.org/2000/svg"
            colorInterpolationFilters="sRGB"
          >
            <filter
              id="liquidglass-displacement"
              primitiveUnits="objectBoundingBox"
              x="0"
              y="0"
              width="1"
              height="1"
            >
              <feImage
                href={displacementImage}
                result="displacementMap"
                x="0"
                y="0"
                width="1"
                height="1"
              />
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={options.beforeBlur}
                result="blur"
              />
              <feDisplacementMap
                in="blur"
                in2="displacementMap"
                scale={options.displacementScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
          {/* <img
            src={displacementImage}
            alt="Liquid Glass Displacement"
            className="absolute inset-0 h-full w-full rounded-none object-cover"
          /> */}
        </>
      )}
    </div>
  );
}

export default function LiquidGlassWrapper() {
  const [options, setOptions] = useState<LiquidGlassOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    pane
      .addBinding(options, 'width', {
        min: 100,
        max: 800,
        step: 1,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'height', {
        min: 100,
        max: 800,
        step: 1,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'rounded', {
        min: 0,
        max: 400,
        step: 1,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'bubbleness', {
        min: 0,
        max: 1.5,
        step: 0.1,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'displacementScale', {
        min: 0,
        max: 10,
        step: 0.1,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'beforeBlur', {
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on('change', () => setOptions({ ...options }));
    pane
      .addBinding(options, 'afterBlur', {
        min: 0,
        max: 60,
        step: 1,
      })
      .on('change', () => setOptions({ ...options }));
  });

  return <LiquidGlass options={options} />;
}
