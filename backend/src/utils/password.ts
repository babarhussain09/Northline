import { hash, verify, Algorithm } from '@node-rs/argon2';

export function hashPassword(password: string) {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
