"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import { mockRegisterSession } from "@/lib/mockApi";
import {
  CLASS_OPTIONS,
  hasErrors,
  normalizeMobile,
  validateRegistration,
  type RegistrationErrors,
} from "@/lib/validation";
import type { RegistrationInput } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { session, hydrated, updateSession } = useSession();

  const [values, setValues] = useState<RegistrationInput>({
    parentName: "",
    parentMobile: "",
    childName: "",
    childClass: "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Restore anything already captured this session (e.g. after a back-navigation).
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    setRestored(true);
    if (session.parentName || session.childName) {
      setValues({
        parentName: session.parentName,
        parentMobile: session.parentMobile,
        childName: session.childName,
        childClass: session.childClass,
      });
    }
  }

  function setField(field: keyof RegistrationInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear a field's error as soon as the parent starts correcting it.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      // Move focus to the first problem so it isn't missed on a phone.
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    setSubmitting(true);
    const { sessionToken } = await mockRegisterSession(values);

    updateSession({
      parentName: values.parentName.trim(),
      parentMobile: normalizeMobile(values.parentMobile),
      childName: values.childName.trim(),
      childClass: values.childClass,
      sessionToken,
      // A new registration starts a fresh test session.
      consentGiven: false,
      otpVerified: false,
      responses: {},
      scores: undefined,
      orderId: undefined,
      completedAt: undefined,
    });

    router.push("/link");
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
        <StepIndicator step={1} total={3} label="Your details" />

        <h1 className="mt-7 text-h1 font-semibold text-text">
          Set up your child&apos;s test
        </h1>
        <p className="mt-4 text-lead text-text-secondary">
          Four details, then we generate the link your child opens to take the
          test.
        </p>

        <Card className="mt-10">
          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={submitting} className="space-y-7">
              <legend className="sr-only">Registration details</legend>

              <TextField
                id="parentName"
                label="Your name"
                autoComplete="name"
                placeholder="Anita Sharma"
                value={values.parentName}
                error={errors.parentName}
                onChange={(e) => setField("parentName", e.target.value)}
              />

              <TextField
                id="parentMobile"
                label="Your mobile number"
                hint="Used to verify it is you before the test starts."
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={15}
                placeholder="10-digit mobile number"
                value={values.parentMobile}
                error={errors.parentMobile}
                onChange={(e) => setField("parentMobile", e.target.value)}
              />

              <TextField
                id="childName"
                label="Your child's name"
                placeholder="Rohan"
                value={values.childName}
                error={errors.childName}
                onChange={(e) => setField("childName", e.target.value)}
              />

              <SelectField
                id="childClass"
                label="Your child's class"
                placeholder="Select a class"
                options={CLASS_OPTIONS}
                value={values.childClass}
                error={errors.childClass}
                onChange={(e) => setField("childClass", e.target.value)}
              />
            </fieldset>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="mt-9 w-full"
              loading={submitting}
              loadingText="Generating your link"
            >
              Generate test link
            </Button>

            <p aria-live="polite" className="sr-only">
              {submitting ? "Generating your test link, please wait." : ""}
            </p>
          </form>
        </Card>

        <p className="mt-6 text-note text-text-muted">
          Demo build — nothing is sent or stored beyond this browser session.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
