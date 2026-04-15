import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plainText: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(passwordHash, plainText, ARGON2_OPTIONS);
}
