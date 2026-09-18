"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import { DEMO_OTP, mockSendOtp, mockVerifyOtp } from "@/lib/mockApi";
import { TOTAL_QUESTIONS } from "@/lib/scoring";
import {
  CLASS_OPTIONS,
  formatMobile,
  hasErrors,
  isValidMobile,
  normalizeMobile,
  validateRegistration,
  type RegistrationErrors,
} from "@/lib/validation";
import type { RegistrationInput } from "@/types";

export default function ResumePage() {
  const router = useRouter();
  const { session, hydrated, updateSession } = useSession();

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [consentError, setConsentError] = useState<string>();

  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();

  const values: RegistrationInput = {
    parentName: session.parentName,
    parentMobile: session.parentMobile,
    childName: session.childName,
    childClass: session.childClass,
  };

  /** Fields write straight through to SessionContext, so edits survive a refresh. */
  function setField(field: keyof RegistrationInput, value: string) {
    const patch: Partial<typeof session> = { [field]: value };

    // Changing the number invalidates anything already verified against the old one.
    if (field === "parentMobile" && (session.otpVerified || codeSent)) {
      patch.otpVerified = false;
      setCodeSent(false);
      setCode("");
      setOtpError(undefined);
    }

    updateSession(patch);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSendOtp() {
    if (!isValidMobile(values.parentMobile)) {
      setErrors((prev) => ({
        ...prev,
        parentMobile: "Enter a valid 10-digit mobile number first.",
      }));
      document.getElementById("parentMobile")?.focus();
      return;
    }

    setOtpError(undefined);
    setSending(true);
    await mockSendOtp(normalizeMobile(values.parentMobile));
    setSending(false);
    setCodeSent(true);
  }

  async function handleVerifyOtp() {
    setOtpError(undefined);
    setVerifying(true);
    const { verified } = await mockVerifyOtp(code);
    setVerifying(false);

    if (verified) {
      updateSession({ otpVerified: true });
    } else {
      setOtpError("That code does not look right. Enter any 4 digits.");
    }
  }

  function handleStart() {
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);

    const missingConsent = !session.consentGiven;
    setConsentError(
      missingConsent ? "Please confirm consent before starting." : undefined,
    );

    if (hasErrors(nextErrors)) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    if (missingConsent) {
      document.getElementById("consent")?.focus();
      return;
    }
    if (!session.otpVerified) {
      document.getElementById("otp")?.focus();
      return;
    }

    updateSession({ parentMobile: normalizeMobile(values.parentMobile) });
    router.push("/test");
  }

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-28 rounded-full bg-surface-sunk" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-sunk" />
            <div className="h-80 rounded-xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading your details.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const childLabel = session.childName || "your child";
  const readyToStart = session.consentGiven && session.otpVerified;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
        <StepIndicator step={3} total={3} label="Consent and verification" />

        <h1 className="mt-7 text-h1 font-semibold text-text">
          Before {childLabel} starts
        </h1>
        <p className="mt-4 text-lead text-text-secondary">
          Check the details are right, confirm consent, and verify your mobile
          number.
        </p>

        {/* ------------------------------------------------------- details */}
        <Card className="mt-10">
          <h2 className="text-h3 font-semibold text-text">Your details</h2>
          <p className="mt-1.5 text-body text-text-secondary">
            Edit anything that is not right.
          </p>

          <div className="mt-7 space-y-7">
            <TextField
              id="parentName"
              label="Your name"
              autoComplete="name"
              value={values.parentName}
              error={errors.parentName}
              onChange={(e) => setField("parentName", e.target.value)}
            />
            <TextField
              id="parentMobile"
              label="Your mobile number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={15}
              value={values.parentMobile}
              error={errors.parentMobile}
              onChange={(e) => setField("parentMobile", e.target.value)}
            />
            <TextField
              id="childName"
              label="Your child's name"
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
          </div>
        </Card>

        {/* ------------------------------------------------------- consent */}
        <Card className="mt-6">
          <h2 className="text-h3 font-semibold text-text">Parental consent</h2>
          <div className="mt-5">
            <ConsentCheckbox
              checked={session.consentGiven}
              error={consentError}
              onChange={(checked) => {
                updateSession({ consentGiven: checked });
                if (checked) setConsentError(undefined);
              }}
            >
              I am {childLabel}&apos;s parent or guardian, and I consent to them
              taking this assessment. I understand the result describes their
              interests, not their ability, and is not a prediction of academic
              performance.
            </ConsentCheckbox>
          </div>
        </Card>

        {/* ------------------------------------------------------------ otp
            Only appears once consent is given — one decision at a time. */}
        {session.consentGiven && (
        <Card className="disha-fade-in mt-6">
          <h2 className="text-h3 font-semibold text-text">
            Verify your mobile
          </h2>

          {session.otpVerified ? (
            <p className="mt-5 flex items-baseline gap-3 border-l-2 border-ok-700 pl-5 text-body text-text">
              <span className="font-medium text-ok-700">Verified</span>
              {isValidMobile(values.parentMobile) && (
                <span className="text-text-secondary">
                  {formatMobile(values.parentMobile)}
                </span>
              )}
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-body text-text-secondary">
                {codeSent
                  ? `We have sent a 4-digit code to ${formatMobile(values.parentMobile)}.`
                  : "We will send a 4-digit code to the number above."}
              </p>

              {!codeSent ? (
                <Button
                  onClick={handleSendOtp}
                  loading={sending}
                  loadingText="Sending code"
                  className="mt-6 w-full sm:w-auto"
                >
                  Send code
                </Button>
              ) : (
                <div className="mt-6 space-y-6">
                  <TextField
                    id="otp"
                    label="4-digit code"
                    hint={`Demo build — no SMS is sent. Use ${DEMO_OTP}, or any 4 digits.`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    placeholder="1234"
                    value={code}
                    error={otpError}
                    disabled={verifying}
                    className="font-mono text-lead tracking-[0.5em]"
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setOtpError(undefined);
                    }}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleVerifyOtp}
                      loading={verifying}
                      loadingText="Verifying"
                      disabled={code.length !== 4}
                      className="w-full sm:w-auto"
                    >
                      Verify code
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={handleSendOtp}
                      loading={sending}
                      loadingText="Resending"
                      className="w-full sm:w-auto"
                    >
                      Resend code
                    </Button>
                  </div>
                </div>
              )}

              <p aria-live="polite" className="sr-only">
                {sending && "Sending your verification code."}
                {verifying && "Verifying your code."}
                {codeSent && !sending && !verifying && "Verification code sent."}
              </p>
            </>
          )}
        </Card>
        )}

        {/* --------------------------------------------------------- start */}
        <div className="mt-10">
          <Button
            variant="accent"
            size="lg"
            onClick={handleStart}
            className="w-full"
            aria-disabled={!readyToStart}
          >
            Start the test
          </Button>

          {!readyToStart && (
            <p className="mt-4 text-center text-note text-text-muted">
              {!session.consentGiven
                ? "Confirm consent above to continue."
                : "Verify your mobile number to continue."}
            </p>
          )}

          <p className="mt-6 text-center text-note text-text-muted">
            {TOTAL_QUESTIONS} questions · about 5 minutes · answers save as you go
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
