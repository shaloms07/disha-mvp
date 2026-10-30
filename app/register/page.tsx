"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/Wordmark";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import { CAREERS } from "@/lib/matching";
import { ApiError, registerSession, sendOtp, verifyOtp } from "@/lib/api/realSession";
import { getStoredAuthToken, getStoredParentIdentity, setStoredAuthToken, setStoredParentIdentity } from "@/lib/auth/client";
import { consentText } from "@/lib/consent";
import { trackCustomEvent, trackStandardEvent } from "@/lib/meta/pixel";
import {
  // SCHOOL, schoolTestLink - only used by the school-code field, commented
  // out below alongside it.
  normalizeSchoolCode,
  schoolContextFromCode,
} from "@/lib/school/schoolCode";
import { useResendCooldown } from "@/lib/useResendCooldown";
import {
  CLASS_OPTIONS,
  OTHER_CLASS_OPTION,
  formatMobile,
  hasErrors,
  normalizeMobile,
  validateRegistration,
  type RegistrationErrors,
} from "@/lib/validation";
import type { RegistrationInput } from "@/types";

/**
 * Options for the optional "what do you have in mind for your child" field.
 * A dropdown rather than free text so the dissonance comparison on the school
 * dashboard is a clean string match against matching.ts output.
 */
const PREFERENCE_OPTIONS = CAREERS.map((career) => career.title);

/** The three selling points under the headline, each keyed to a RIASEC hue. */
const HIGHLIGHTS = [
  { label: "Free", color: "var(--color-riasec-a)" },
  { label: "About 5 minutes", color: "var(--color-riasec-e)" },
  { label: "36 quick questions", color: "var(--color-riasec-c)" },
];

/** How it works, one line each — ad traffic lands here, so it stays short. */
const STEPS = [
  {
    title: "Register",
    body: "Your details and your child's. About a minute.",
    color: "var(--color-riasec-r)",
  },
  {
    title: "Your child answers",
    body: "36 quick pairs — pick whichever appeals more.",
    color: "var(--color-riasec-i)",
  },
  {
    title: "See the snapshot",
    body: "Six interest scores, free, the moment they finish.",
    color: "var(--color-riasec-s)",
  },
];

/**
 * One OTP verification covers the whole account, not each ward - a
 * signed-in parent registering a second child skips the otp step entirely,
 * since their mobile was already proven at an earlier verification
 * (server/routes/register.ts sets otpVerified itself for an authenticated
 * caller).
 */
type Step = "class" | "details" | "otp" | "delivery";

export default function RegisterPage() {
  const router = useRouter();
  const { session, hydrated, updateSession, startFreshRegistration } =
    useSession();

  const [step, setStep] = useState<Step>("class");

  const [values, setValues] = useState<RegistrationInput>({
    parentName: "",
    parentMobile: "",
    childName: "",
    childClass: "",
    childClassOther: "",
    schoolCode: "",
    parentStatedPreference: "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  /** The mobile is already registered - the error is shown with a sign-in CTA instead of plain text. */
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  /** School code + career preference, folded away so ad traffic sees few fields */
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState<string>();

  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();
  const resend = useResendCooldown();

  /**
   * A signed-in parent's name/mobile are already on file (cached at sign-in -
   * see app/signin/page.tsx) - this screen never asks for them again when
   * registering another ward, and never re-verifies their mobile either.
   */
  const [signedInAs, setSignedInAs] = useState<{ name: string; mobile: string } | null>(null);
  useEffect(() => {
    const identity = getStoredParentIdentity();
    if (!identity) return;
    setSignedInAs(identity);
    setValues((prev) => ({ ...prev, parentName: identity.name, parentMobile: identity.mobile }));
  }, []);

  // Resolved live as the parent types, so a mistyped code is visible before
  // they submit rather than after — and so the link previewed below is the
  // link they will actually be given on the next screen.
  // School code field is hidden for now (see the commented-out block below) -
  // typedCode/schoolMatch commented out with it since they're unused without it.
  // const typedCode = values.schoolCode?.trim() ?? "";
  // const schoolMatch = typedCode ? resolveSchoolCode(typedCode) : null;

  /**
   * Opening /register always starts a new registration.
   *
   * The previous child's name, number and answers are not a helpful default
   * for the next one — reaching this screen at all means "set up a test", and
   * the details belong to whoever is being set up now. Nothing is restored,
   * and the stored session is cleared so a stale token or an old set of module
   * answers can't follow the new registration down the funnel.
   *
   * The exception is a parent who arrived from a /CODE/test link: that route
   * writes the school and section and then lands here, so the code is seeded
   * into the form and startFreshRegistration keeps it. See its comment for the
   * rule that decides when it survives.
   */
  const [initialised, setInitialised] = useState(false);
  if (hydrated && !initialised) {
    setInitialised(true);
    const arrivedFromSchoolLink =
      Boolean(session.schoolId) &&
      !session.sessionToken &&
      !session.scores &&
      Object.keys(session.responses).length === 0;
    if (arrivedFromSchoolLink && session.schoolCode) {
      setValues((prev) => ({ ...prev, schoolCode: session.schoolCode ?? "" }));
    }
  }

  // Read the session above first, then clear it — the effect runs after the
  // render that seeded the form, so the two can't race.
  const cleared = useRef(false);
  useEffect(() => {
    if (!hydrated || cleared.current) return;
    cleared.current = true;
    startFreshRegistration();
  }, [hydrated, startFreshRegistration]);

  function setField(field: keyof RegistrationInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear a field's error as soon as the parent starts correcting it.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function selectClass(value: string) {
    setField("childClass", value);
    trackCustomEvent("ClassSelected", { class: value });
    if (value !== OTHER_CLASS_OPTION) setStep("details");
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateRegistration(values, { requireParentFields: !signedInAs });
    setErrors(nextErrors);
    const missingConsent = !consentGiven;
    setConsentError(missingConsent ? "Please confirm consent before continuing." : undefined);

    if (hasErrors(nextErrors)) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    if (missingConsent) {
      document.getElementById("consent")?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(undefined);
    setAlreadyRegistered(false);

    let sessionToken: string;
    try {
      ({ sessionToken } = await registerSession(values, getStoredAuthToken(), consentGiven));
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.code === "ALREADY_REGISTERED") {
        setAlreadyRegistered(true);
        setSubmitError(error.message);
      } else {
        setSubmitError(
          error instanceof Error ? error.message : "Registration failed. Please try again.",
        );
      }
      return;
    }

    // Blank or unrecognised code -> no school context at all, i.e. exactly the
    // individual B2C session this screen has always produced.
    const schoolCode = values.schoolCode?.trim()
      ? normalizeSchoolCode(values.schoolCode)
      : "";
    const schoolContext = schoolCode ? schoolContextFromCode(schoolCode) : null;
    const preference = values.parentStatedPreference?.trim() || undefined;

    updateSession({
      parentName: values.parentName.trim(),
      parentMobile: normalizeMobile(values.parentMobile),
      childName: values.childName.trim(),
      childClass: values.childClass,
      childClassOther:
        values.childClass === OTHER_CLASS_OPTION ? values.childClassOther?.trim() || undefined : undefined,
      sessionToken,
      consentGiven: true,
      // A signed-in caller is verified server-side the moment this session is
      // created (server/routes/register.ts) - everyone else still needs the
      // OTP step that follows.
      otpVerified: Boolean(signedInAs),
      responses: {},
      scores: undefined,
      orderId: undefined,
      completedAt: undefined,
      // School pilot context — undefined for an ordinary individual signup.
      schoolCode: schoolContext ? schoolCode : undefined,
      schoolId: schoolContext?.schoolId,
      classId: schoolContext?.classId,
      parentStatedPreference: preference,
      aptitudeResponses: undefined,
      aptitudeScores: undefined,
      personalityResponses: undefined,
      personalityScores: undefined,
      workValuesResponses: undefined,
      workValuesScores: undefined,
    });

    setSubmitting(false);
    if (signedInAs) {
      // Their mobile was already proven at an earlier verification (see the
      // otpVerified: Boolean(signedInAs) line above) - this is their
      // completion moment, same event the OTP-verify branch fires below.
      trackStandardEvent("CompleteRegistration", {}, `reg_${sessionToken}`);
    }
    setStep(signedInAs ? "delivery" : "otp");
  }

  async function handleSendOtp() {
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
      const { verified, error, authToken, parentName, parentMobile } = await verifyOtp(session.sessionToken, code);
      if (verified) {
        updateSession({ otpVerified: true });
        // Verifying a mobile number here proves ownership exactly like a
        // sign-in OTP would, so this signs the parent in too.
        if (authToken && parentName && parentMobile) {
          setStoredAuthToken(authToken);
          setStoredParentIdentity({ name: parentName, mobile: parentMobile });
        }
        trackStandardEvent("CompleteRegistration", {}, `reg_${session.sessionToken}`);
        setStep("delivery");
      } else {
        setOtpError(error ?? "That code does not look right.");
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Could not verify the code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  /** Back to the details step to fix a wrong number - a fresh code gets sent
   *  for whatever number they land on next, same as any other edit there. */
  function handleChangeNumber() {
    setCodeSent(false);
    setCode("");
    setOtpError(undefined);
    resend.reset();
    setStep("details");
  }

  // Opens by itself when the preference field has an error, so nothing needing
  // attention stays folded away. (Add values.schoolCode / errors.schoolCode
  // back here if the school-code field below is brought back.)
  const showOptional = optionalOpen || Boolean(errors.parentStatedPreference);

  const stepOrder: Step[] = signedInAs ? ["class", "details", "delivery"] : ["class", "details", "otp", "delivery"];
  const stepIndex = stepOrder.indexOf(step) + 1;
  const childLabel = values.childName.trim() || "your child";

  return (
    <>
      <main className="flex-1">
        {/* Meta ads land here directly, so this page carries its own hero —
            dark field, spectrum rule, one line of pitch — with the form beside
            it (below it on a phone), hanging over the band's lower edge the
            way the landing page's sample panel does. No overflow-hidden on
            the section, or it would clip that overhang. */}
        <section className="grain relative bg-ink-deep text-white">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <div className="flex items-center justify-between gap-4 py-6">
              <Link href="/">
                <Wordmark onDark />
              </Link>
              <ButtonLink
                href={signedInAs ? "/wards" : "/signin"}
                variant="quietOnDark"
                size="sm"
              >
                {signedInAs ? "My wards" : "Sign in"}
              </ButtonLink>
            </div>

            <div className="grid gap-10 pt-6 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:pt-14">
              <div className="lg:pt-8">
                <SpectrumRule className="w-24" />
                <h1 className="mt-7 text-h1 font-semibold text-white sm:text-display">
                  {signedInAs
                    ? "Register another ward"
                    : "What career will suit your child?"}
                </h1>
                <p className="mt-5 max-w-md text-lead text-on-dark">
                  {signedInAs
                    ? "Just their details — we already have yours on file."
                    : "A career interest test for Classes 8–12, built on the RIASEC model. Your child answers, you get the snapshot."}
                </p>

                <ul className="mt-7 flex flex-wrap gap-2.5">
                  {HIGHLIGHTS.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-note text-on-dark"
                    >
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative z-20 -mb-28 text-text">
                <Card className="shadow-feature">
                  <StepIndicator step={stepIndex} total={stepOrder.length} label="" />

                  {/* ---------------------------------------------- step: class */}
                  {step === "class" && (
                    <div className="mt-6">
                      <h2 className="text-h3 font-semibold text-text">
                        Which class is your child in?
                      </h2>
                      <div className="mt-6 grid grid-cols-3 gap-2.5">
                        {CLASS_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => selectClass(option)}
                            className={`min-h-12 rounded-lg border text-body font-medium transition-colors ${
                              values.childClass === option
                                ? "border-brand-700 bg-brand-50 text-brand-800"
                                : "border-control-line bg-surface text-text hover:border-brand-700"
                            }`}
                          >
                            {option === OTHER_CLASS_OPTION
                              ? "Other"
                              : option.replace("Class ", "")}
                          </button>
                        ))}
                      </div>

                      {values.childClass === OTHER_CLASS_OPTION && (
                        <div className="mt-6">
                          <TextField
                            id="childClassOther"
                            label="Please specify the class"
                            placeholder="e.g. Class 7"
                            value={values.childClassOther ?? ""}
                            error={errors.childClassOther}
                            onChange={(e) => setField("childClassOther", e.target.value)}
                          />
                          <Button
                            className="mt-5 w-full"
                            onClick={() => {
                              if (!values.childClassOther?.trim()) {
                                setErrors((prev) => ({
                                  ...prev,
                                  childClassOther: "Please enter your child's class.",
                                }));
                                return;
                              }
                              setStep("details");
                            }}
                          >
                            Continue
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* -------------------------------------------- step: details */}
                  {step === "details" && (
                    <div className="mt-6">
                      <h2 className="text-h3 font-semibold text-text">
                        {signedInAs ? "Your child's details" : "Your details"}
                      </h2>
                      <p className="mt-1 text-note text-text-muted">
                        {signedInAs
                          ? `Registering as ${signedInAs.name}.`
                          : "We'll send a one-time code to verify your number next."}
                      </p>

                      <form onSubmit={handleDetailsSubmit} noValidate className="mt-6">
                        <fieldset disabled={submitting} className="space-y-6">
                          <legend className="sr-only">Registration details</legend>

                          {!signedInAs && (
                            <>
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
                            </>
                          )}

                          <TextField
                            id="childName"
                            label="Your child's name"
                            placeholder="Rohan"
                            value={values.childName}
                            error={errors.childName}
                            onChange={(e) => setField("childName", e.target.value)}
                          />
                        </fieldset>

                        {/* Both optional (SCHOOL_ADMIN_SPEC.md Section 6), and folded
                            behind a toggle so the details above are the whole ask
                            for a parent arriving from an ad. See showOptional above
                            for when it opens by itself. */}
                        <div className="mt-6 border-t border-hairline pt-5">
                          <button
                            type="button"
                            aria-expanded={showOptional}
                            aria-controls="optional-details"
                            onClick={() => setOptionalOpen((open) => !open)}
                            className="flex w-full items-center justify-between gap-3 text-left text-note font-medium text-brand-700 hover:text-brand-600"
                          >
                            <span>Career preference (optional)</span>
                            <span aria-hidden="true" className="text-lead leading-none">
                              {showOptional ? "−" : "+"}
                            </span>
                          </button>
                        </div>

                        <fieldset
                          id="optional-details"
                          hidden={!showOptional}
                          disabled={submitting}
                          className="mt-6 space-y-6"
                        >
                          <legend className="sr-only">Optional details</legend>
                          <SelectField
                            id="parentStatedPreference"
                            label="A career or field you have in mind for your child"
                            hint="We keep this aside until after the results, so it can't influence the test."
                            placeholder="No particular one"
                            options={PREFERENCE_OPTIONS}
                            value={values.parentStatedPreference ?? ""}
                            error={errors.parentStatedPreference}
                            onChange={(e) =>
                              setField("parentStatedPreference", e.target.value)
                            }
                          />
                        </fieldset>

                        <div className="mt-6">
                          <ConsentCheckbox
                            checked={consentGiven}
                            error={consentError}
                            onChange={(checked) => {
                              setConsentGiven(checked);
                              if (checked) setConsentError(undefined);
                            }}
                          >
                            {consentText(childLabel)}
                          </ConsentCheckbox>
                        </div>

                        {submitError && (
                          <div role="alert" className="mt-6">
                            <p className="text-note text-err-700">{submitError}</p>
                            {alreadyRegistered && (
                              <ButtonLink
                                href="/signin"
                                variant="secondary"
                                size="sm"
                                className="mt-3 w-full"
                              >
                                Sign in
                              </ButtonLink>
                            )}
                          </div>
                        )}

                        <Button
                          type="submit"
                          variant="accent"
                          size="lg"
                          className="mt-8 w-full"
                          loading={submitting}
                          loadingText={signedInAs ? "Getting your link" : "Continuing"}
                        >
                          {signedInAs ? "Get my free test link" : "Continue"}
                        </Button>

                        <p aria-live="polite" className="sr-only">
                          {submitting ? "Saving your details, please wait." : ""}
                        </p>

                        {!signedInAs && (
                          <p className="mt-3 text-center text-note text-text-secondary">
                            Already registered?{" "}
                            <Link href="/signin" className="font-medium text-brand-700 underline">
                              Sign in
                            </Link>
                          </p>
                        )}
                      </form>
                    </div>
                  )}

                  {/* ------------------------------------------------ step: otp */}
                  {step === "otp" && (
                    <div className="mt-6">
                      <h2 className="text-h3 font-semibold text-text">
                        Verify your mobile
                      </h2>
                      <p className="mt-1.5 text-body text-text-secondary">
                        {codeSent
                          ? `We have sent a 4-digit code to ${formatMobile(values.parentMobile)}.`
                          : `We will send a 4-digit code to ${formatMobile(values.parentMobile)}.`}{" "}
                        <button
                          type="button"
                          onClick={handleChangeNumber}
                          className="font-medium text-brand-700 underline"
                        >
                          Wrong number? Change it
                        </button>
                      </p>

                      {!codeSent ? (
                        <Button
                          onClick={handleSendOtp}
                          loading={sending}
                          loadingText="Sending code"
                          className="mt-6 w-full"
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
                    </div>
                  )}

                  {/* -------------------------------------------- step: delivery */}
                  {step === "delivery" && (
                    <div className="mt-6">
                      <h2 className="text-h3 font-semibold text-text">
                        How should {childLabel} take the test?
                      </h2>
                      <p className="mt-1.5 text-body text-text-secondary">
                        Many children take it right away on their parent&apos;s
                        phone — or you can send the link for later.
                      </p>
                      <div className="mt-6 flex flex-col gap-3">
                        <Button size="lg" className="w-full" onClick={() => router.push("/test")}>
                          Open the test on this device
                        </Button>
                        <Button
                          variant="secondary"
                          size="lg"
                          className="w-full"
                          onClick={() => router.push("/link")}
                        >
                          Send the test link to my child
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="mt-6 text-center text-note text-text-muted">
                    No payment needed. Your details are used only to run this
                    assessment and share the results.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Clears the form's overhang. On desktop the steps sit in the left
            column, under the pitch, with the card still to their right. */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-40 pb-4 lg:pt-16">
          <ol className="grid gap-7 sm:grid-cols-3 lg:max-w-[calc(100%-31rem)] lg:grid-cols-1 lg:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-lead font-semibold text-white"
                  style={{ backgroundColor: step.color }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-body font-medium text-text">{step.title}</p>
                  <p className="mt-0.5 text-note text-text-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
