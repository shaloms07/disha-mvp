/**
 * Registration form rules. Shared by /register and /resume, which collect the
 * same four fields — /resume just starts them prefilled and editable.
 */

import type { RegistrationInput } from "@/types";

export const CLASS_OPTIONS = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;

/**
 * Reduce a typed mobile number to its 10 national digits, tolerating the ways
 * people actually type them: "+91 98765 43210", "098765-43210", "9876543210".
 */
export function normalizeMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Indian mobile numbers are 10 digits starting 6-9 */
export function isValidMobile(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeMobile(raw));
}

/** "9876543210" -> "98765 43210", for read-back on the OTP screen */
export function formatMobile(raw: string): string {
  const digits = normalizeMobile(raw);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : raw;
}

export function validateRegistration(
  values: RegistrationInput,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (values.parentName.trim().length < 2) {
    errors.parentName = "Please enter your name.";
  }
  if (!values.parentMobile.trim()) {
    errors.parentMobile = "Please enter your mobile number.";
  } else if (!isValidMobile(values.parentMobile)) {
    errors.parentMobile = "Enter a 10-digit mobile number starting with 6-9.";
  }
  if (values.childName.trim().length < 2) {
    errors.childName = "Please enter your child's name.";
  }
  if (!values.childClass) {
    errors.childClass = "Please select your child's class.";
  }

  return errors;
}

export function hasErrors(errors: RegistrationErrors): boolean {
  return Object.keys(errors).length > 0;
}
