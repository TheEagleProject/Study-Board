module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  rules: {
    'no-console': ['warn', { allow: ['error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
