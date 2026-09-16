"use client";

import { useRef, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { useSession } from "@/lib/context/SessionContext";
import {
  resolveSchoolCode,
  schoolTestLink,
} from "@/lib/school/schoolCode";

type CopyState = "idle" | "copied" | "failed";

export default function LinkPage() {
  const { session, hydrated } = useSession();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  async function handleCopy(link: string) {
    if (resetTimer.current) clearTimeout(resetTimer.current);

    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
    } catch {
      // Clipboard access can be blocked (insecure context, permissions).
      // Select the text so the parent can copy it by hand instead.
      linkInput.current?.select();
      setCopyState("failed");
    }

    resetTimer.current = setTimeout(() => setCopyState("idle"), 2500);
  }

  // Waiting on sessionStorage — see SessionContext's `hydrated`.
  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-28 rounded-full bg-surface-sunk" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-sunk" />
            <div className="h-48 rounded-xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading your test link.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Everything below renders only after hydration, so window is available.
  if (!session.sessionToken) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-h1 font-semibold text-text">No test link yet</h1>
          <p className="mt-4 text-lead text-text-secondary">
            This session does not have a test link. Register first and we will
            generate one.
          </p>
          <ButtonLink
            href="/register"
            size="lg"
            className="mt-9 w-full sm:w-auto"
          >
            Go to registration
          </ButtonLink>
        </main>
        <SiteFooter />
      </>
    );
  }

  // A school-tagged session gets the branded entry link, which carries the
  // school and section in the URL itself. Everyone else gets exactly the link
  // this screen has always produced.
  const testLink = session.schoolCode
    ? schoolTestLink(session.schoolCode, session.sessionToken)
    : `${window.location.origin}/resume?t=${session.sessionToken}`;

  const schoolMatch = session.schoolCode
    ? resolveSchoolCode(session.schoolCode)
    : null;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
        <StepIndicator step={2} total={3} label="Test link" />

        <h1 className="mt-7 text-h1 font-semibold text-text">
          {session.childName
            ? `${session.childName}'s test link is ready`
            : "The test link is ready"}
        </h1>
        <p className="mt-4 text-lead text-text-secondary">
          This link opens the test. Your child can use it on their own phone, or
          you can open it here on yours.
        </p>

        {schoolMatch && (
          <p className="mt-4 rounded-lg border border-hairline bg-brand-50 px-4 py-3 text-body text-brand-800">
            Registered with{" "}
            <strong className="font-medium">{schoolMatch.school.name}</strong>
            {schoolMatch.schoolClass ? (
              <> · section {schoolMatch.schoolClass.id}</>
            ) : null}
            . The link below carries that, so the results reach the school
            without anyone typing a code again.
          </p>
        )}

        <Card className="mt-10">
          <label
            htmlFor="test-link"
            className="block text-body font-medium text-text"
          >
            Test link
          </label>
          <input
            ref={linkInput}
            id="test-link"
            readOnly
            value={testLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 min-h-12 w-full rounded-lg border border-control-line bg-surface-sunk px-4 py-3 font-mono text-note text-text"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => handleCopy(testLink)}
              variant={copyState === "copied" ? "secondary" : "primary"}
              className="w-full sm:w-auto"
            >
              {copyState === "copied" ? "Copied" : "Copy link"}
            </Button>
            <ButtonLink
              href="/resume"
              variant="quiet"
              className="w-full sm:w-auto"
            >
              Open the test now
            </ButtonLink>
          </div>

          <p aria-live="polite" className="mt-3 min-h-5 text-note">
            {copyState === "copied" && (
              <span className="text-ok-700">Link copied to your clipboard.</span>
            )}
            {copyState === "failed" && (
              <span className="text-err-700">
                Could not copy automatically — the link is selected, copy it by
                hand.
              </span>
            )}
          </p>

          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-hairline pt-6 text-note">
            <dt className="text-text-muted">Session token</dt>
            <dd className="text-right font-mono text-text">
              {session.sessionToken}
            </dd>
            {session.childName && (
              <>
                <dt className="text-text-muted">For</dt>
                <dd className="text-right text-text">
                  {session.childName}
                  {session.childClass ? `, ${session.childClass}` : ""}
                </dd>
              </>
            )}
          </dl>
        </Card>

        <div className="mt-8 space-y-5 text-body text-text-secondary">
          <p>
            <span className="font-medium text-text">
              You can come back to this later.
            </span>{" "}
            The link stays valid — your child does not have to start right now,
            and progress is saved as they answer.
          </p>
          <p className="border-l-2 border-hairline pl-5 text-note">
            <span className="font-medium text-text">Demo build:</span> in the
            live product this link is delivered to your WhatsApp. Nothing is
            sent here — copy it yourself, or open the test directly.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
