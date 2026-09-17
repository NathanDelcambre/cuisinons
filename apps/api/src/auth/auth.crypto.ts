import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';

export async function hashPassword(password: string, pepper: string): Promise<string> {
  return argon2.hash(`${password}${pepper}`, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string, pepper: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, `${password}${pepper}`);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 32);
}

export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
