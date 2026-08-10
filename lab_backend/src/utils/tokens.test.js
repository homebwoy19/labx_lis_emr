import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
} from "./tokens.js";

describe("access tokens", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signAccessToken({ userId: "u-1", organizationId: "o-1" });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe("u-1");
    expect(decoded.organizationId).toBe("o-1");
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ userId: "u-1" });
    expect(() => verifyAccessToken(token + "x")).toThrow();
  });
});

describe("refresh tokens", () => {
  it("generates a raw value with a matching sha-256 hash", () => {
    const { raw, hash } = generateRefreshToken();
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(20);
    expect(hash).toBe(hashToken(raw));
    expect(hash).toHaveLength(64);
  });

  it("produces distinct tokens each call", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.raw).not.toBe(b.raw);
  });
});
