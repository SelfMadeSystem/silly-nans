import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { clamp } from '../utils/mathUtils';
import { Vector2 } from '../utils/vec';
import { motion } from 'motion/react';
import { useRef } from 'react';

export default function CursorButton() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { x } =
    usePointerPosition(btnRef, { onlyInside: true }) ?? new Vector2(9999, 0);
  const center = (btnRef.current?.clientWidth ?? 0) / 2 || 1;
  const rx = x - center;
  const distToRight = clamp((center * 2 - x) / center, 0, 1);

  return (
    <div className="flex gap-12">
      <button ref={btnRef} className="relative isolate cursor-pointer">
        {[...Array(5)].map((_, i) => {
          const t = 1 - i / 5;
          const d = Math.min(Math.abs(rx * t) / center, t) ** 0.5;
          return (
            <div key={i} className="absolute inset-0">
              <div className="absolute inset-0 overflow-hidden rounded-full blur-lg">
                <motion.div
                  className="pointer-events-none absolute top-0 bottom-0 left-0 aspect-[3] h-full -translate-x-1/2 rounded-[100%] bg-[#f60]"
                  style={{ left: 40 + t * 60 + '%' }}
                  initial={{
                    scale: rx < 0 ? 0 : d,
                  }}
                  animate={{
                    scale: rx < 0 ? 0 : d,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                />
                <motion.div
                  className="pointer-events-none absolute top-0 bottom-0 left-0 aspect-[3] h-full -translate-x-1/2 rounded-[100%] bg-[#f60]"
                  style={{ left: 60 - t * 60 + '%' }}
                  initial={{ scale: rx < 0 ? d : 0 }}
                  animate={{ scale: rx < 0 ? d : 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="pointer-events-none absolute top-0 bottom-0 left-0 aspect-[4] h-full -translate-x-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle at center, #fa9, #f50 40%, transparent 80%)`,
            }}
            initial={{ left: x === 9999 ? '100%' : x }}
            animate={{ left: x === 9999 ? '100%' : x }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
        <div className="absolute inset-0 rounded-full bg-[#bbb] mix-blend-screen" />
        <span className="relative z-10 block px-24 py-3 text-sm font-bold text-black">
          Do something crazy!
        </span>
      </button>
      <button className="group relative isolate cursor-pointer">
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="pointer-events-none absolute top-0 bottom-0 aspect-[4] h-full translate-x-1/2"
            style={{
              background: `linear-gradient(90deg, #f60, #f60, #0000)`,
            }}
            initial={{ right: '100%' }}
            animate={{ right: 100 + distToRight * 50 + '%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-[#333] mix-blend-screen transition-colors group-hover:border-[#444]" />
        <div className="absolute inset-0 m-[2px] rounded-full bg-[#000b] mix-blend-multiply" />
        <span className="relative z-10 m-2 block px-24 py-3 text-sm font-bold text-white">
          Hewwo
        </span>
      </button>
    </div>
  );
}
