"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import { CAREERS } from "@/lib/matching";
import { mockRegisterSession } from "@/lib/mockApi";
import {
  SCHOOL,
  normalizeSchoolCode,
  resolveSchoolCode,
  schoolContextFromCode,
  schoolTestLink,
} from "@/lib/school/schoolCode";
import {
  CLASS_OPTIONS,
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

export default function RegisterPage() {
  const router = useRouter();
  const { session, hydrated, updateSession, startFreshRegistration } =
    useSession();

  const [values, setValues] = useState<RegistrationInput>({
    parentName: "",
    parentMobile: "",
    childName: "",
    childClass: "",
    schoolCode: "",
    parentStatedPreference: "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Resolved live as the parent types, so a mistyped code is visible before
  // they submit rather than after — and so the link previewed below is the
  // link they will actually be given on the next screen.
  const typedCode = values.schoolCode?.trim() ?? "";
  const schoolMatch = typedCode ? resolveSchoolCode(typedCode) : null;

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
      sessionToken,
      // A new registration starts a fresh test session.
      consentGiven: false,
      otpVerified: false,
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
          A few details, then we generate the link your child opens to take the
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

            {/* Both optional (SCHOOL_ADMIN_SPEC.md Section 6). Kept below a
                divider so the four details above stay the whole ask for a
                parent signing up on their own. */}
            <fieldset disabled={submitting} className="mt-8 space-y-7 border-t border-hairline pt-8">
              <legend className="sr-only">Optional details</legend>

              <p className="text-note text-text-muted">
                Optional — you can skip both of these.
              </p>

              <div>
                <TextField
                  id="schoolCode"
                  label="School code"
                  hint={`Only if your school is running DISHA. Your school shares this code — e.g. ${SCHOOL.code}-10A.`}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Leave blank if you're registering on your own"
                  value={values.schoolCode ?? ""}
                  error={errors.schoolCode}
                  onChange={(e) => setField("schoolCode", e.target.value)}
                />

                {/* Confirms what the code resolved to, and previews the exact
                    link the next screen will hand over. */}
                {schoolMatch && (
                  <div
                    aria-live="polite"
                    className="mt-3 rounded-lg border border-hairline bg-brand-50 px-4 py-3"
                  >
                    <p className="flex items-start gap-2 text-body font-medium text-brand-800">
                      <span aria-hidden="true">✓</span>
                      <span>{schoolMatch.school.name}</span>
                    </p>
                    <p className="mt-1 text-note text-text-secondary">
                      {schoolMatch.schoolClass ? (
                        <>
                          Section {schoolMatch.schoolClass.id} ·{" "}
                          {schoolMatch.schoolClass.teacherName}&apos;s class
                        </>
                      ) : (
                        <>
                          No section in this code — add one (e.g.{" "}
                          {SCHOOL.code}-10A) so the results reach the right
                          class teacher.
                        </>
                      )}
                    </p>
                    <p className="mt-2.5 text-note text-text-secondary">
                      Your child&apos;s test will cover all four modules rather
                      than interests alone, so it takes longer than the standard
                      test.
                    </p>
                    <p className="mt-2.5 text-note text-text-muted">
                      Test link:{" "}
                      <span className="font-mono break-all text-text-secondary">
                        {schoolTestLink(typedCode)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

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
