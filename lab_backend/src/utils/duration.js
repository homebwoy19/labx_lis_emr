/**
 * Parses short duration strings ("15m", "7d", "30s", "12h") into milliseconds.
 * Used to translate JWT/session TTL config into concrete expiry dates and cookie
 * max-age values. Falls back to treating a bare number as milliseconds.
 */
const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(value) {
  if (typeof value === "number") return value;
  const match = /^(\d+)\s*([smhd])$/.exec(String(value).trim());
  if (!match) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
    throw new Error(`Invalid duration: ${value}`);
  }
  return Number(match[1]) * UNIT_MS[match[2]];
}

export default durationToMs;
