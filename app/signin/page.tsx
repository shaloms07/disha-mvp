"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { sendSignInOtp, verifySignInOtp } from "@/lib/api/auth";
import { fetchSessionByToken } from "@/lib/api/realSession";
import { setStoredAuthToken, setStoredParentIdentity } from "@/lib/auth/client";
import { formatMobile, isValidMobile, normalizeMobile } from "@/lib/validation";

/**
 * Sign in with mobile + OTP to see every ward registered on that number
 * (server/API.md's POST /auth/otp/send + /auth/otp/verify) - distinct from
 * the per-test OTP on /resume, which only verifies one registration's own
 * mobile field.
 */
export default function SignInPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState<string>();
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidMobile(mobile)) {
      setMobileError("Enter a 10-digit mobile number starting with 6-9.");
      return;
    }
    setMobileError(undefined);
    setSending(true);
    try {
      await sendSignInOtp(normalizeMobile(mobile));
      setCodeSent(true);
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Could not send the code. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpError(undefined);
    setVerifying(true);
    try {
      const normalizedMobile = normalizeMobile(mobile);
      const result = await verifySignInOtp(normalizedMobile, code);
      if (!result.verified || !result.token) {
        setOtpError(result.error ?? "That code does not look right.");
        return;
      }
      setStoredAuthToken(result.token);

      // Cache the parent's name too (their mobile we already have from the
      // form above), so /register never has to ask for either again when
      // adding another ward - signing in requires at least one existing
      // registration, so there's always a ward to read it from.
      const firstWard = result.wards?.[0];
      if (firstWard) {
        const server = await fetchSessionByToken(firstWard.sessionToken).catch(() => null);
        if (server) {
          setStoredParentIdentity({ name: server.parentName, mobile: normalizedMobile });
        }
      }

      router.push("/wards");
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Could not verify the code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-h1 font-semibold text-text">Sign in</h1>
        <p className="mt-4 text-lead text-text-secondary">
          Enter the mobile number you registered with to see your child&apos;s
          test progress and results.
        </p>

        <Card className="mt-10">
          {!codeSent ? (
            <form onSubmit={handleSendCode} noValidate>
              <fieldset disabled={sending} className="space-y-7">
                <legend className="sr-only">Mobile number</legend>
                <TextField
                  id="mobile"
                  label="Your mobile number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  error={mobileError}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setMobileError(undefined);
                  }}
                />
              </fieldset>

              {otpError && (
                <p role="alert" className="mt-6 text-note text-err-700">
                  {otpError}
                </p>
              )}

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="mt-9 w-full"
                loading={sending}
                loadingText="Sending code"
              >
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} noValidate>
              <fieldset disabled={verifying} className="space-y-7">
                <legend className="sr-only">Verification code</legend>
                <p className="text-body text-text-secondary">
                  We have sent a 4-digit code to {formatMobile(mobile)}.
                </p>
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
                  className="font-mono text-lead tracking-[0.5em]"
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setOtpError(undefined);
                  }}
                />
              </fieldset>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={verifying}
                  loadingText="Verifying"
                  disabled={code.length !== 4}
                >
                  Verify and sign in
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={sending}
                  loadingText="Resending"
                  onClick={() => {
                    void sendSignInOtp(normalizeMobile(mobile));
                  }}
                >
                  Resend code
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-6 text-note text-text-muted">
          Haven&apos;t registered yet?{" "}
          <Link href="/register" className="text-brand-700 underline">
            Start a new test
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
