import * as astro from 'prettier-plugin-astro';

/** @type {import("prettier").Config} */
export default {
  // i am just using the standard config, change if you need something else
  plugins: [astro],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  tabWidth: 2,
  arrowParens: 'avoid',
};
