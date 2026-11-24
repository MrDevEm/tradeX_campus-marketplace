import { hash, verify, Algorithm } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

/**
 * Hash a password using Argon2id with a unique salt for every password.
 * Conforms to OWASP Password Hashing recommendations.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verifies a plain-text password against an Argon2id or legacy bcrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  // Argon2id verification
  if (storedHash.startsWith('$argon2')) {
    try {
      return await verify(storedHash, password);
    } catch {
      return false;
    }
  }

  // Backwards compatibility for existing bcrypt hashes
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Checks whether the stored hash is already using the preferred Argon2id format.
 */
export function isArgon2Hash(storedHash: string): boolean {
  return typeof storedHash === 'string' && storedHash.startsWith('$argon2id');
}
