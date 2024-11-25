import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import parser from 'astro-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends('plugin:astro/recommended'),
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.astro'],

    languageOptions: {
      parser: parser,
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {},
  },
  eslintConfigPrettier,
  eslintPluginPrettier,
];
