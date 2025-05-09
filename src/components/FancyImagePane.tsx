import { fancyImageOptions, fancyImageSpringOptions } from './FancyImageStore';
import { useEffect } from 'react';
import { Pane } from 'tweakpane';

const createFancyImagePane = () => {
  // I know I'm not using nanostore properly at all, but I'm not sure how to use
  // it with Tweakpane properly.
  const pane = new Pane();
  const folder = pane.addFolder({ title: 'Fancy Image' });

  folder.addBinding(fancyImageOptions.value, 'scrollSpeed', {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'Scroll Speed',
  });
  folder.addBinding(fancyImageOptions.value, 'rgbDiff', {
    min: 0,
    max: 0.8,
    step: 0.01,
    label: 'RGB Diff',
  });

  // Add Spring config folder
  const springFolder = pane.addFolder({ title: 'Spring Animation' });

  springFolder.addBinding(fancyImageSpringOptions.value, 'tension', {
    min: 0,
    max: 100,
    step: 1,
    label: 'Tension',
  });
  springFolder.addBinding(fancyImageSpringOptions.value, 'friction', {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'Friction',
  });
  springFolder.addBinding(fancyImageSpringOptions.value, 'bounce', {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'Bounce',
  });
  springFolder.addBinding(fancyImageSpringOptions.value, 'maxScrollSpeed', {
    min: 0,
    max: 1000,
    step: 1,
    label: 'Max Scroll Speed',
  });

  return pane;
};

export default function FancyImagePane() {
  useEffect(() => {
    const pane = createFancyImagePane();

    return () => {
      pane.dispose();
    };
  }, []);

  return <></>;
}
