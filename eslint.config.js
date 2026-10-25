// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Globals the pure layers (sim, data, run, meta) must never touch (SPEC §13.2–13.3). */
const impureGlobals = [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'performance', 'Date', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'setImmediate', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'crypto', 'process', 'globalThis',
  'Promise',
].map((name) => ({ name, message: `${name} is impure; src/sim must stay deterministic (SPEC §13.3).` }));

/** Math functions that are not guaranteed bit-identical across JS engines (SPEC §13.3 rule 3). */
const bannedMath = ['random', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh',
  'tanh', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'hypot', 'cbrt', 'fround']
  .map((property) => ({ object: 'Math', property, message: `Math.${property} is banned in pure code (SPEC §13.3).` }));

const pureRules = {
  'no-restricted-globals': ['error', ...impureGlobals],
  'no-restricted-properties': ['error', ...bannedMath],
  'no-restricted-syntax': ['error',
    { selector: "BinaryExpression[operator='**']", message: '`**` is banned in pure code; multiply explicitly.' },
    { selector: "AssignmentExpression[operator='**=']", message: '`**=` is banned in pure code.' },
    { selector: 'FunctionDeclaration[async=true]', message: 'async is banned in pure code.' },
    { selector: 'ArrowFunctionExpression[async=true]', message: 'async is banned in pure code.' },
    { selector: 'FunctionExpression[async=true]', message: 'async is banned in pure code.' },
    { selector: 'AwaitExpression', message: 'await is banned in pure code.' },
  ],
};

const forbiddenFromPure = ['**/render/**', '**/ui/**', '**/app/**', '**/tools/**', 'node:*', 'fs', 'path', 'os', 'child_process'];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'artifacts/**', 'reports/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      ...pureRules,
      'no-restricted-imports': ['error', { patterns: [
        { group: [...forbiddenFromPure, '**/run/**', '**/meta/**'], message: 'src/sim may only import from src/sim and src/data (SPEC §13.2).' },
      ] }],
    },
  },
  {
    files: ['src/data/**/*.ts'],
    rules: {
      ...pureRules,
      'no-restricted-imports': ['error', { patterns: [
        { group: [...forbiddenFromPure, '**/sim/**', '**/run/**', '**/meta/**'], message: 'src/data is the bottom layer (SPEC §13.2).' },
      ] }],
    },
  },
  {
    files: ['src/render/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/ui/**', '**/app/**', '**/tools/**'], message: 'render may only read sim state (SPEC §13.2).' },
      ] }],
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/app/**', '**/tools/**'], message: 'ui sits below app (SPEC §13.2).' },
      ] }],
    },
  },
);
