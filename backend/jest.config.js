module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testTimeout: 10000,
};
