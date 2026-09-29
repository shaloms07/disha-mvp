/**
 * Registration form rules. Shared by /register and /resume, which collect the
 * same four fields — /resume just starts them prefilled and editable.
 */

import { resolveSchoolCode } from "@/lib/school/schoolCode";
import type { RegistrationInput } from "@/types";

export const CLASS_OPTIONS = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Other",
] as const;

/** The one CLASS_OPTIONS value with a free-text follow-up (childClassOther). */
export const OTHER_CLASS_OPTION = "Other";

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
  /**
   * false when registering a new ward while already signed in - the parent's
   * name and mobile are already on file (server/routes/register.ts reuses
   * the existing Parent row), so this screen never collects them again and
   * has nothing to validate here either.
   */
  { requireParentFields = true }: { requireParentFields?: boolean } = {},
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (requireParentFields) {
    if (values.parentName.trim().length < 2) {
      errors.parentName = "Please enter your name.";
    }
    if (!values.parentMobile.trim()) {
      errors.parentMobile = "Please enter your mobile number.";
    } else if (!isValidMobile(values.parentMobile)) {
      errors.parentMobile = "Enter a 10-digit mobile number starting with 6-9.";
    }
  }
  if (values.childName.trim().length < 2) {
    errors.childName = "Please enter your child's name.";
  }
  if (!values.childClass) {
    errors.childClass = "Please select your child's class.";
  } else if (values.childClass === OTHER_CLASS_OPTION && !values.childClassOther?.trim()) {
    errors.childClassOther = "Please enter your child's class.";
  }

  // Optional (SCHOOL_ADMIN_SPEC.md Section 6): blank is a normal individual
  // registration, so only a filled-in code that resolves to nothing is an error.
  if (values.schoolCode?.trim() && !resolveSchoolCode(values.schoolCode)) {
    errors.schoolCode =
      "We don't recognise that code. Check it with your school, or leave it blank.";
  }

  return errors;
}

export function hasErrors(errors: RegistrationErrors): boolean {
  return Object.keys(errors).length > 0;
}
