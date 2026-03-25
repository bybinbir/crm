import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'jest.setup.js'],
  },
];
