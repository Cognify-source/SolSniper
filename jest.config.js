// jest.config.js – ESM-friendly Jest configuration
/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/src/tests/**/*.test.js"],
};
