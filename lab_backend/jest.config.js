/**
 * Jest configuration.
 *
 * The project is native ESM ("type": "module"), so we run Jest with
 * --experimental-vm-modules (see the test script) and disable transforms.
 * setupFiles provisions a valid test environment before any module — including
 * the fail-fast config loader — is imported.
 */
export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/setup.js"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  verbose: true,
};
