import { passwordIssues, passwordSchema } from "./passwordPolicy.js";

describe("password policy", () => {
  it("accepts a compliant password", () => {
    expect(passwordIssues("Str0ng!Pass")).toEqual([]);
    expect(passwordSchema.safeParse("Str0ng!Pass").success).toBe(true);
  });

  it("rejects a password that is too short", () => {
    const issues = passwordIssues("Ab1!x");
    expect(issues).toContain("at least 10 characters");
  });

  it("flags each missing character class", () => {
    expect(passwordIssues("alllowercase1!")).toContain("an uppercase letter");
    expect(passwordIssues("ALLUPPERCASE1!")).toContain("a lowercase letter");
    expect(passwordIssues("NoDigitsHere!!")).toContain("a number");
    expect(passwordIssues("NoSpecials123")).toContain("a special character");
  });

  it("surfaces policy failures through the zod schema", () => {
    const result = passwordSchema.safeParse("weak");
    expect(result.success).toBe(false);
    expect(result.error.issues.length).toBeGreaterThan(0);
  });
});
