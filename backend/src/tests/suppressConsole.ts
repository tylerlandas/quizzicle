// Suppress console.error output during tests. Routes log caught errors via
// console.error; many tests intentionally trigger those error paths. The noise
// clutters test output without adding diagnostic value for the test runner.
jest.spyOn(console, 'error').mockImplementation(() => undefined);
