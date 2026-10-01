import { FlatCompat } from '@eslint/eslintrc';

// Next 15.5: `next lint` eskirgan — ESLint 9 flat config to'g'ridan-to'g'ri ishlatiladi.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'data/**'],
  },
  {
    rules: {
      // `_` bilan boshlangan ishlatilmaydigan nomlar va rest-siblings (`{ total: _t, ...r }`) xato emas
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
];

export default config;
