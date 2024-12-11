type Stripe = {
  // size width is always 1; just multiply sizeHeight and sizeWidth by the same
  // number to get the actual size
  sizeHeight: number;
  stripeWidth: number;
  gapWidth: number;
  // angle is always 45 degrees; the math gets too complicated otherwise
};

/**
 * Generates a {@link Stripe} object with a certain number of stripes in a 1x1
 * square.
 */
function generateStripesSquare(numStripes: number): Stripe {
  const sizeHeight = 2 / numStripes;
  const stripeWidth = 1 / (2 + numStripes);
  return {
    sizeHeight,
    stripeWidth,
    gapWidth: stripeWidth,
  };
}

/**
 * Converts a {@link Stripe} object to a CSS linear-gradient string.
 */
function stripeToLinearGradient(stripe: Stripe, color: string): string {
  const { stripeWidth, gapWidth } = stripe;
  const numStripes = Math.ceil(2 / (stripeWidth + gapWidth));
  const stripes = Array.from({ length: numStripes }, (_, i) => {
    const offset = stripeWidth;
    const c = i % 2 === 0 ? color : 'transparent';
    if ((i + 1) * offset >= 1) {
      return `${c} ${i * offset * 100}%`;
    }
    return `${c} ${i * offset * 100}% ${(i + 1) * offset * 100}%`;
  });
  return `linear-gradient(45deg, ${stripes.join(', ')})`;
}

/**
 * Converts a {@link Stripe} object to a CSS background-size string.
 */
function stripeToBackgroundSize(stripe: Stripe, width: number): string {
  const { sizeHeight } = stripe;
  return `${width}px ${width * sizeHeight}px`;
}

/**
 * Converts a {@link Stripe} object to a CSS string (background-image, background-size).
 */
function stripeToCSS(
  stripe: Stripe,
  color: string,
  width: number,
): string {
  return `
    background-image: ${stripeToLinearGradient(stripe, color)};
    background-size: ${stripeToBackgroundSize(stripe, width)};
  `;
}

console.log(stripeToCSS(generateStripesSquare(1.25), 'var(--l)', 50));
