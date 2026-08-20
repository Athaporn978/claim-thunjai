import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** bcrypt hashes always start with $2a$, $2b$, or $2y$ followed by the cost factor. */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext row (pre-bcrypt migration) — compare directly.
  // Caller is responsible for re-hashing and persisting on a successful match.
  return plain === stored;
}
