import { atom } from 'nanostores';

const defaultImageOptions = {
  scrollSpeed: 1,
  rgbDiff: 0.3,
};
const defaultSpringConfig = {
  tension: 10,
  friction: 0.9,
  bounce: 0,
  maxScrollSpeed: 200,
};

export type FancyImageOptions = typeof defaultImageOptions;
export type FancyImageSpringOptions = typeof defaultSpringConfig;
export const fancyImageOptions = atom<FancyImageOptions>({
  ...defaultImageOptions,
});
export const fancyImageSpringOptions = atom<FancyImageSpringOptions>({
  ...defaultSpringConfig,
});
