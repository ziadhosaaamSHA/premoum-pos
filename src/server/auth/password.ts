import argon2 from "argon2";
import { HttpError } from "@/server/http";

export function assertStrongPassword(password: string) {
  if (password.length < 10) {
    throw new HttpError(400, "weak_password", "Password must be at least 10 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new HttpError(400, "weak_password", "Password must include an uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    throw new HttpError(400, "weak_password", "Password must include a lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    throw new HttpError(400, "weak_password", "Password must include a number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new HttpError(400, "weak_password", "Password must include a symbol.");
  }
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
