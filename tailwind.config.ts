import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const fadeUtil = plugin(function ({ addUtilities, matchUtilities, theme, e }) {
  const fadeValues = theme('fadeValues', {});
  const utilities = Object.entries(fadeValues).map(([key, value]) => ({
    [`.fade-t-${e(key)}`]: {
      mask: `linear-gradient(to bottom, transparent 0%, black ${value})`,
    },
    [`.fade-b-${e(key)}`]: {
      mask: `linear-gradient(to top, transparent 0%, black ${value})`,
    },
    [`.fade-y-${e(key)}`]: {
      mask: `linear-gradient(to bottom, transparent 0%, black ${value}, black calc(100% - ${value}), transparent 100%)`,
    },
  }));

  utilities.push({
    '.fade-t': {
      mask: `linear-gradient(to bottom, transparent 0%, black 1em)`,
    },
    '.fade-b': {
      mask: `linear-gradient(to top, transparent 0%, black 1em)`,
    },
    '.fade-y': {
      mask: `linear-gradient(to bottom, transparent 0%, black 1em, black calc(100% - 1em), transparent 100%)`,
    },
  });

  addUtilities(utilities, { respectPrefix: false, respectImportant: false });

  matchUtilities({
    'fade-t': modifier => {
      return {
        mask: `linear-gradient(to bottom, transparent 0%, black ${modifier})`,
      };
    },
  });

  matchUtilities({
    'fade-b': modifier => {
      return {
        mask: `linear-gradient(to top, transparent 0%, black ${modifier})`,
      };
    },
  });

  matchUtilities({
    'fade-y': modifier => {
      return {
        mask: `linear-gradient(to bottom, transparent 0%, black ${modifier}, black calc(100% - ${modifier}), transparent 100%)`,
      };
    },
  });
});

const backdropHueRotateUtil = plugin(function ({ addUtilities }) {
  addUtilities({
    '.animate-backdrop-hue-rotate': {
      '--tw-backdrop-hue-rotate':
        'hue-rotate(var(--tw-animate-backdrop-hue-rotate))',
      animation: 'backdrop-hue-rotate 20s linear infinite',
    },
  });
});

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fadeValues: {
        '1': '0.25em',
        '2': '0.5em',
        '4': '1em',
        '8': '2em',
        '12': '3em',
        '16': '4em',
        xs: '0.25em',
        sm: '0.5em',
        base: '1em',
        lg: '3em',
        xl: '6em',
      },
      animation: {
        'backdrop-hue-rotate': 'backdrop-hue-rotate 20s linear infinite',
      },
      keyframes: {
        'backdrop-hue-rotate': {
          '0%': {
            '--tw-animate-backdrop-hue-rotate': '0deg',
          },
          to: {
            '--tw-animate-backdrop-hue-rotate': '360deg',
          },
        },
      },
    },
  },
  plugins: [fadeUtil, backdropHueRotateUtil],
} satisfies Config;
