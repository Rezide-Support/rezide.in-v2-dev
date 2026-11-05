import { z } from "zod";
import { OTP_LENGTH } from "./constants";

/** Shared Zod rules so every form validates the same way. */

export const indianMobile = z
  .string()
  .trim()
  .min(1, "Enter your mobile number.")
  .regex(/^\d{10}$/, "Enter a 10-digit mobile number.")
  .regex(/^[6-9]/, "Indian mobile numbers start with 6, 7, 8 or 9.");

export const otpCode = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code.`);

export const personName = (what = "name") =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${what}.`)
    .max(60, `Keep your ${what} under 60 characters.`);

export const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address, or leave it blank.");

export const requiredEmail = z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address."));

/** Indian RERA agent/firm registration numbers vary by state; accept 8–20 letters and digits. */
export const reraId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9/-]{8,20}$/, "Enter your RERA registration number (8–20 letters or digits).");

export const pincode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code.");
