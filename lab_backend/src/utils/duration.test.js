import { durationToMs } from "./duration.js";

describe("durationToMs", () => {
  it("parses seconds, minutes, hours, days", () => {
    expect(durationToMs("30s")).toBe(30_000);
    expect(durationToMs("15m")).toBe(15 * 60_000);
    expect(durationToMs("12h")).toBe(12 * 3_600_000);
    expect(durationToMs("7d")).toBe(7 * 86_400_000);
  });

  it("passes through raw numbers as milliseconds", () => {
    expect(durationToMs(5000)).toBe(5000);
    expect(durationToMs("5000")).toBe(5000);
  });

  it("throws on garbage input", () => {
    expect(() => durationToMs("soon")).toThrow();
  });
});
