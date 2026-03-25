import nextPlugin from 'eslint-config-next';
import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ...nextPlugin,
  },
  {
    ignores: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'jest.setup.js'],
  },
];
