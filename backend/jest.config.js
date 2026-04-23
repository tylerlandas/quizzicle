/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  verbose: true,
  // Suppress console.error noise from route error handlers during tests that
  // intentionally trigger error paths (validation failures, 404s, etc.)
  silent: false,
  setupFiles: ['<rootDir>/src/tests/suppressConsole.ts'],
};
