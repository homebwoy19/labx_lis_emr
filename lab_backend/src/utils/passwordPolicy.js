import { z } from "zod";

/**
 * Central password policy.
 *
 * Minimum 10 characters with at least one lowercase, one uppercase, one digit,
 * and one special character. Exposed as both a reusable Zod field and a plain
 * predicate so it can be enforced at the API boundary and in services.
 */
export const PASSWORD_MIN_LENGTH = 10;

const RULES = [
  { test: (v) => v.length >= PASSWORD_MIN_LENGTH, message: `at least ${PASSWORD_MIN_LENGTH} characters` },
  { test: (v) => /[a-z]/.test(v), message: "a lowercase letter" },
  { test: (v) => /[A-Z]/.test(v), message: "an uppercase letter" },
  { test: (v) => /[0-9]/.test(v), message: "a number" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), message: "a special character" },
];

export function passwordIssues(value) {
  return RULES.filter((r) => !r.test(value)).map((r) => r.message);
}

/** Zod schema fragment for a policy-compliant password. */
export const passwordSchema = z
  .string()
  .superRefine((value, ctx) => {
    for (const issue of passwordIssues(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Password must contain ${issue}`,
      });
    }
  });

export default passwordSchema;
