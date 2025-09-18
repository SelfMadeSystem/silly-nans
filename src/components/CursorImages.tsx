import { usePrevious } from '../utils/hooks/hooks';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { useRollingAverage } from '../utils/hooks/useRollingAverage';
import { useThreshold } from '../utils/hooks/useThreshold';
import { Vector2 } from '../utils/vec';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  imageSize: 200,
  velocityThreshold: 70,
  rollingAverageWindow: 5,
  unlimited: false,
  maxImages: 5,
  imageLifetime: 2000,
  exitOnComplete: true,
  velocityMultiplier: 20,
  rotationRange: 30,
  springStiffness: 300,
  springDamping: 30,
  exitDuration: 0.5,
};

type CursorImagesOptions = typeof defaultOptions;

function CursorImage({
  src,
  pos,
  velocity,
  remove,
  options,
}: {
  src: string;
  pos: Vector2;
  velocity: Vector2;
  remove: () => void;
  options: CursorImagesOptions;
}) {
  const [ogRotate] = useState((Math.random() - 0.5) * options.rotationRange);
  const [nextRotate] = useState((Math.random() - 0.5) * options.rotationRange);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      remove();
    }, options.imageLifetime);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [remove, options.imageLifetime]);
  return (
    <motion.img
      src={src}
      alt=""
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 object-cover select-none"
      style={{
        width: options.imageSize,
        height: options.imageSize,
        borderRadius: 8,
        boxShadow: `0 4px 8px rgba(0, 0, 0, 0.2)`,
        willChange: 'transform, opacity',
      }}
      initial={{
        x: pos.x,
        y: pos.y,
        rotate: ogRotate,
      }}
      animate={{
        x: [pos.x, pos.x + velocity.x * options.velocityMultiplier],
        y: [pos.y, pos.y + velocity.y * options.velocityMultiplier],
        rotate: [ogRotate, nextRotate],
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        default: {
          type: 'spring',
          stiffness: options.springStiffness,
          damping: options.springDamping,
        },
        opacity: { duration: options.exitDuration, ease: 'easeOut' },
        scale: { duration: options.exitDuration, ease: 'easeOut' },
      }}
      onAnimationComplete={() => {
        if (options.exitOnComplete) remove();
      }}
    />
  );
}

const imageSrcs = [
  '/images/image1.jpg',
  '/images/image2.jpg',
  '/images/image3.jpg',
  '/images/image4.jpg',
  '/images/image5.jpg',
  '/images/image6.jpg',
  '/images/image7.jpg',
  '/images/image8.jpg',
];

function CursorImages({ options }: { options: CursorImagesOptions }) {
  const elemRef = useRef<HTMLDivElement>(null);
  const cursorPos = usePointerPosition(elemRef);
  const prevPos = usePrevious(cursorPos);
  const velocity = prevPos && cursorPos ? cursorPos.sub(prevPos) : null;
  const [smoothVelocityX, resetX] = useRollingAverage(
    velocity?.x ?? 0,
    options.rollingAverageWindow,
  );
  const [smoothVelocityY, resetY] = useRollingAverage(
    velocity?.y ?? 0,
    options.rollingAverageWindow,
  );
  const smoothVelocity = new Vector2(smoothVelocityX, smoothVelocityY);
  const val = useThreshold(smoothVelocity.length(), options.velocityThreshold, [
    cursorPos,
  ]);
  const [images, setImages] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (val === 0 || !cursorPos) return;
    resetX();
    resetY();
    const src = imageSrcs[Math.floor(Math.random() * imageSrcs.length)];
    let imageVelocity = smoothVelocity;
    if (imageVelocity.length() > options.velocityThreshold * 2) {
      imageVelocity = imageVelocity.setLength(options.velocityThreshold * 2);
    }
    const newImage = (
      <CursorImage
        key={Date.now()}
        src={src}
        pos={cursorPos}
        velocity={imageVelocity}
        options={options}
        remove={() =>
          setImages(images => images.filter(img => img.key !== newImage.key))
        }
      />
    );
    setImages(images => {
      const newImages = options.unlimited
        ? [...images, newImage]
        : [...images, newImage].slice(-options.maxImages);
      return newImages;
    });
    // We only want to trigger this effect when `val` changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  return (
    <div className="relative -z-10" ref={elemRef}>
      <AnimatePresence>{Array.from(images)}</AnimatePresence>
    </div>
  );
}

export default function CursorImagesWrapper() {
  const [options] = useState<CursorImagesOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const appearanceFolder = pane.addFolder({
        title: 'Appearance',
        expanded: false,
      });
      appearanceFolder.addBinding(options, 'imageSize', {
        min: 50,
        max: 400,
        step: 10,
      });
    }

    {
      const behaviorFolder = pane.addFolder({
        title: 'Behavior',
        expanded: false,
      });
      behaviorFolder.addBinding(options, 'velocityThreshold', {
        min: 10,
        max: 200,
        step: 5,
      });
      behaviorFolder.addBinding(options, 'unlimited');
      behaviorFolder.addBinding(options, 'maxImages', {
        min: 1,
        max: 20,
        step: 1,
      });
      behaviorFolder.addBinding(options, 'imageLifetime', {
        min: 500,
        max: 10000,
        step: 100,
      });
      behaviorFolder.addBinding(options, 'exitOnComplete');
      behaviorFolder.addBinding(options, 'rollingAverageWindow', {
        min: 1,
        max: 20,
        step: 1,
      });
    }

    {
      const animationFolder = pane.addFolder({
        title: 'Animation',
        expanded: true,
      });
      animationFolder.addBinding(options, 'velocityMultiplier', {
        min: 1,
        max: 100,
        step: 1,
      });
      animationFolder.addBinding(options, 'rotationRange', {
        min: 0,
        max: 180,
        step: 5,
      });
      animationFolder.addBinding(options, 'springStiffness', {
        min: 50,
        max: 1000,
        step: 10,
      });
      animationFolder.addBinding(options, 'springDamping', {
        min: 5,
        max: 100,
        step: 5,
      });
      animationFolder.addBinding(options, 'exitDuration', {
        min: 0.1,
        max: 2,
        step: 0.1,
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
      presetsFolder.addButton({ title: 'Subtle' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          imageSize: 150,
          velocityThreshold: 100,
          maxImages: 3,
          imageLifetime: 1500,
          velocityMultiplier: 10,
          rotationRange: 15,
          exitDuration: 0.8,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Dramatic' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          imageSize: 300,
          velocityThreshold: 40,
          unlimited: true,
          imageLifetime: 3000,
          velocityMultiplier: 20,
          rotationRange: 60,
          springStiffness: 200,
          springDamping: 20,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Fast & Snappy' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          imageSize: 120,
          velocityThreshold: 10,
          maxImages: 10,
          imageLifetime: 1000,
          velocityMultiplier: 15,
          rotationRange: 45,
          springStiffness: 500,
          springDamping: 40,
          exitDuration: 0.3,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Springy' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          imageSize: 250,
          velocityThreshold: 60,
          maxImages: 7,
          imageLifetime: 2500,
          velocityMultiplier: 25,
          rotationRange: 45,
          springStiffness: 200,
          springDamping: 10,
          exitDuration: 0.3,
        });
        pane.refresh();
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <CursorImages options={options} />;
}
