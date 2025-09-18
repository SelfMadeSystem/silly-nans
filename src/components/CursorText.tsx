import { usePrevious } from '../utils/hooks/hooks';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { useRollingAverage } from '../utils/hooks/useRollingAverage';
import { useThreshold } from '../utils/hooks/useThreshold';
import { Vector2 } from '../utils/vec';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';

const defaultOptions = {
  text: `Apparently motionless to her passengers and crew, the Interplanetary liner Hyperion bored serenely onward through space at normal acceleration. In the railed-off sanctum in one corner of the control room a bell tinkled, a smothered whirr was heard, and Captain Bradley frowned as he studied the brief message upon the tape of the recorder--a message flashed to his desk from the operator's panel. He beckoned, and the second officer, whose watch it now was, read aloud: "Reports of scout patrols still negative." "Still negative." The officer scowled in thought. "They've already searched beyond the widest possible location of the wreckage, too. Two unexplained disappearances inside a month--first the Dione, then the Rhea--and not a plate nor a lifeboat recovered. Looks bad, sir. One might be an accident; two might possibly be a coincidence...." His voice died away. What might that coincidence mean?

"But at three it would get to be a habit," the captain finished the thought. "And whatever happened, happened quick. Neither of them had time to say a word--their location recorders simply went dead. But of course they didn't have our detector screens nor our armament. According to the observatories we're in clear ether, but I wouldn't trust them from Tellus to Luna. You have given the new orders, of course?" "Yes, sir. Detectors full out, all three courses of defensive screen on the trips, projectors manned, suits on the hooks. Every object detected in the outer space to be investigated immediately--if vessels, they are to be warned to stay beyond extreme range. Anything entering the fourth zone is to be rayed." "Right--we are going through!"

Leaving the captain's desk, the watch officer resumed his tour of duty. The six great lookout plates into which the alert observers peered were blank, their far-flung ultra-sensitive detector screens encountering no obstacle--the ether was empty for thousands upon thousands of kilometers. The signal lamps upon the pilot's panel were dark, its warning bells were silent. A brilliant point of white in the center of the pilot's closely ruled micrometer grating, exactly upon the cross-hairs of his directors, showed that the immense vessel was precisely upon the calculated course, as laid down by the automatic integrating course-plotters. Everything was quiet and in order.

"All's well, sir," he reported briefly to Captain Bradley—but all was not well. Danger—more serious by far in that it was not external—was even then, all unsuspected, gnawing at the great ship's vitals. In a locked and shielded compartment, deep down in the interior of the liner, was the great air purifier. Now a man leaned against the primary duct—the aorta through which flowed the stream of pure air supplying the entire vessel. This man, grotesque in full panoply of space armor, leaned against the duct, and as he leaned a drill bit deeper and deeper into the steel wall of the pipe. Soon it broke through, and the slight rush of air was stopped by the insertion of a tightly fitting rubber tube. The tube terminated in a heavy rubber balloon, which surrounded a frail glass bulb. The man stood tense, one hand holding before his silica-and-steel-helmeted head a large pocket chronometer, the other lightly grasping the balloon. A sneering grin was upon his face as he waited the exact second of action—the carefully predetermined instant when his right hand, closing, would shatter the fragile flask and force its contents into the primary air stream of the Hyperion!

Text borrowed from Triplanetary by Edward Elmer Smith.`,
  spawnWords: true,
  fontSize: 30,
  velocityThreshold: 40,
  minimumDistance: 5,
  rollingAverageWindow: 5,
  unlimited: false,
  maxText: 5,
  textLifetime: 2000,
  exitOnComplete: false,
  velocityMultiplier: 0,
  followDirection: false,
  rotationRange: 0,
  springStiffness: 300,
  springDamping: 30,
  exitDuration: 0.5,
};

type CursorTextOptions = typeof defaultOptions;

function CursorText({
  text,
  pos,
  velocity,
  remove,
  options,
}: {
  text: string;
  pos: Vector2;
  velocity: Vector2;
  remove: () => void;
  options: CursorTextOptions;
}) {
  const direction = options.followDirection
    ? Math.atan2(velocity.y, velocity.x) * (180 / Math.PI)
    : 0;
  const [ogRotate] = useState(
    (Math.random() - 0.5) * options.rotationRange + direction,
  );
  const [nextRotate] = useState(
    (Math.random() - 0.5) * options.rotationRange + direction,
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      remove();
    }, options.textLifetime);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [remove, options.textLifetime]);
  return (
    <motion.div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 object-cover select-none"
      style={{
        fontSize: options.fontSize,
        lineHeight: 1,
        fontWeight: 'bold',
        color: 'black',
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
    >
      {text}
    </motion.div>
  );
}

function CursorTexts({ options }: { options: CursorTextOptions }) {
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
  const [prevVal, setPrevVal] = useState(val);
  const [spawnMousePos, setSpawnMousePos] = useState<Vector2 | null>(null);
  const [texts, setTexts] = useState<JSX.Element[]>([]);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (
      val === 0 ||
      !cursorPos ||
      prevVal === val ||
      (spawnMousePos &&
        cursorPos.sub(spawnMousePos).length() < options.minimumDistance)
    )
      return;
    setSpawnMousePos(cursorPos);
    setPrevVal(val);
    const getText = () => {
      if (options.spawnWords) {
        const words = options.text.split(/\s+/);
        return words[textIndex % words.length];
      } else {
        return options.text.slice(
          textIndex % options.text.length,
          (textIndex % options.text.length) + 1,
        );
      }
    };

    resetX();
    resetY();
    const txt = getText();
    setTextIndex(i => i + 1);
    let textVelocity = smoothVelocity;
    if (textVelocity.length() > options.velocityThreshold * 2) {
      textVelocity = textVelocity.setLength(options.velocityThreshold * 2);
    }
    const newText = (
      <CursorText
        key={Date.now()}
        text={txt}
        pos={cursorPos}
        velocity={textVelocity}
        options={options}
        remove={() =>
          setTexts(texts => texts.filter(txt => txt.key !== newText.key))
        }
      />
    );
    setTexts(texts => {
      const newTexts = options.unlimited
        ? [...texts, newText]
        : [...texts, newText].slice(-options.maxText);
      return newTexts;
    });
    // We only want to trigger this effect when `val` changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, cursorPos]);

  return (
    <div className="relative -z-10" ref={elemRef}>
      <AnimatePresence>{Array.from(texts)}</AnimatePresence>
    </div>
  );
}

export default function CursorTextWrapper() {
  const [options] = useState<CursorTextOptions>({
    ...defaultOptions,
  });

  useEffect(() => {
    const pane = new Pane();

    {
      const appearanceFolder = pane.addFolder({
        title: 'Appearance',
        expanded: false,
      });
      appearanceFolder.addBinding(options, 'spawnWords');
      appearanceFolder.addBinding(options, 'fontSize', {
        min: 10,
        max: 100,
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
      behaviorFolder.addBinding(options, 'maxText', {
        min: 1,
        max: 20,
        step: 1,
      });
      behaviorFolder.addBinding(options, 'textLifetime', {
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
        expanded: false,
      });
      animationFolder.addBinding(options, 'velocityMultiplier', {
        min: 0,
        max: 100,
        step: 1,
      });
      animationFolder.addBinding(options, 'followDirection');
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
        expanded: true,
      });
      presetsFolder.addButton({ title: 'Default' }).on('click', () => {
        Object.assign(options, defaultOptions);
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'Text Follow' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          spawnWords: false,
          followDirection: true,
          velocityThreshold: 10,
          minimumDistance: 10,
          unlimited: true,
        });
        pane.refresh();
      });
      presetsFolder.addButton({ title: 'YEET' }).on('click', () => {
        Object.assign(options, {
          ...defaultOptions,
          spawnWords: true,
          fontSize: 50,
          followDirection: true,
          velocityThreshold: 10,
          minimumDistance: 20,
          maxText: 10,
          velocityMultiplier: 50,
          rotationRange: 90,
          springStiffness: 200,
          springDamping: 10,
        });
        pane.refresh();
      });
    }

    return () => {
      pane.dispose();
    };
  }, [options]);

  return <CursorTexts options={options} />;
}
