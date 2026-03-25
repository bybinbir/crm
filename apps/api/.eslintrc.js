module.exports = {
  extends: ['../../packages/config/eslint-base.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    jest: true,
  },
};
