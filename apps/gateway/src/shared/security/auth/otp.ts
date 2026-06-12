import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generates a secure 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP using bcryptjs.
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/**
 * Verifies an OTP against a hash.
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
