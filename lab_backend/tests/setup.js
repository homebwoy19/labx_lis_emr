/**
 * Test environment bootstrap.
 *
 * Runs before any module is imported so the config loader (which fails fast on
 * invalid env) sees a complete, valid configuration. These values are dummy —
 * unit tests here never touch a real database or mail server.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/lis_test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "test_access_secret_key_at_least_32_chars_long";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret_key_at_least_32_chars_long";
