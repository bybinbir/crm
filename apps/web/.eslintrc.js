module.exports = {
  extends: ['next/core-web-vitals', '../../packages/config/eslint-base.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
