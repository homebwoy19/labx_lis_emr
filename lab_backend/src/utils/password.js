import argon2 from "argon2";

/**
 * Password hashing using Argon2id — the recommended memory-hard algorithm.
 * Parameters follow OWASP guidance and can be tuned per deployment.
 */
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain) {
  return argon2.hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export default { hashPassword, verifyPassword };
