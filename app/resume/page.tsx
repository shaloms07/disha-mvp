"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import { fetchSessionByToken, sendOtp, verifyOtp } from "@/lib/api/realSession";
import { TOTAL_QUESTIONS } from "@/lib/scoring";
import { useResendCooldown } from "@/lib/useResendCooldown";
import {
  CLASS_OPTIONS,
  OTHER_CLASS_OPTION,
  formatMobile,
  hasErrors,
  isValidMobile,
  normalizeMobile,
  validateRegistration,
  type RegistrationErrors,
} from "@/lib/validation";
import type { RegistrationInput, RiasecType } from "@/types";

export default function ResumePage() {
  return (
    <Suspense fallback={null}>
      <ResumePageInner />
    </Suspense>
  );
}

function ResumePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, hydrated, updateSession } = useSession();

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [consentError, setConsentError] = useState<string>();

  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();
  const resend = useResendCooldown();

  /**
   * Cross-device resume: app/link/page.tsx hands out a /resume?t=... link
   * meant to be opened on the child's own device. This browser's local
   * session may be empty (fresh device) or simply different - either way,
   * pull the real record down and merge it in, never blindly overwrite what
   * this tab already has (see app/api/session/[token]/route.ts's GET).
   */
  const rehydrated = useRef(false);
  useEffect(() => {
    if (!hydrated || rehydrated.current) return;
    const token = searchParams.get("t");
    if (!token || token === session.sessionToken) return;
    rehydrated.current = true;

    fetchSessionByToken(token)
      .then((server) => {
        if (!server) return;
        updateSession({
          sessionToken: server.sessionToken,
          parentName: session.parentName || server.parentName,
          parentMobile: session.parentMobile || server.parentMobile,
          childName: session.childName || server.childName,
          childClass: session.childClass || server.childClass,
          childClassOther: session.childClassOther ?? server.childClassOther,
          consentGiven: session.consentGiven || server.consentGiven,
          otpVerified: session.otpVerified || server.otpVerified,
          schoolCode: session.schoolCode ?? server.schoolCode,
          schoolId: session.schoolId ?? server.schoolId,
          classId: session.classId ?? server.classId,
          parentStatedPreference: session.parentStatedPreference ?? server.parentStatedPreference,
          // Union rather than replace - this tab's own in-progress answers
          // always win per-question over the server's copy.
          responses: { ...server.responses, ...session.responses },
          scores: session.scores ?? (server.scores as Record<RiasecType, number> | undefined),
          completedAt: session.completedAt ?? server.completedAt,
        });
      })
      .catch((error: unknown) => {
        console.error("[resume] rehydration failed", error);
      });
  }, [hydrated, searchParams, session, updateSession]);

  const values: RegistrationInput = {
    parentName: session.parentName,
    parentMobile: session.parentMobile,
    childName: session.childName,
    childClass: session.childClass,
    childClassOther: session.childClassOther,
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
      resend.reset();
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
    if (!session.sessionToken) return;

    setOtpError(undefined);
    setSending(true);
    try {
      const result = await sendOtp(session.sessionToken, normalizeMobile(values.parentMobile));
      if (!result.success) {
        setOtpError(result.error ?? "Could not send the code. Please try again.");
        return;
      }
      setCodeSent(true);
      resend.start();
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Could not send the code. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!session.sessionToken) return;

    setOtpError(undefined);
    setVerifying(true);
    try {
      const { verified, error } = await verifyOtp(session.sessionToken, code);
      if (verified) {
        updateSession({ otpVerified: true });
      } else {
        setOtpError(error ?? "That code does not look right.");
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Could not verify the code. Please try again.");
    } finally {
      setVerifying(false);
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

            {values.childClass === OTHER_CLASS_OPTION && (
              <TextField
                id="childClassOther"
                label="Please specify the class"
                placeholder="e.g. Class 7"
                value={values.childClassOther ?? ""}
                error={errors.childClassOther}
                onChange={(e) => setField("childClassOther", e.target.value)}
              />
            )}
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
                    hint="Enter the 4-digit code we sent to your mobile."
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
                      disabled={resend.coolingDown || verifying}
                      className="w-full sm:w-auto"
                    >
                      {resend.coolingDown
                        ? `Resend code in ${resend.secondsLeft}s`
                        : "Resend code"}
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
