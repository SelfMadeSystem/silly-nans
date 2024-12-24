import { useEffect, useState, useRef } from "react";

export default function createCanvasComponent(
  props: React.HTMLProps<HTMLCanvasElement>,
  setup: (canvas: HTMLCanvasElement) => void,
): React.FC {
  return function CanvasComponent(props2: React.HTMLProps<HTMLCanvasElement>) {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const didMount = useRef(false);

    useEffect(() => {
      if (!didMount.current && canvas) {
        setup(canvas);
        didMount.current = true;
      }
    }, [canvas]);

    return <canvas {...props} {...props2} ref={setCanvas} />;
  }
}
