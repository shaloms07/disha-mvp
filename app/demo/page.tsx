"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/lib/context/SessionContext";
import { generateMockToken } from "@/lib/mockApi";
import { PERSONAS, buildResponses, type Persona } from "@/lib/personas";
import { getHollandCode, scoreResponses } from "@/lib/scoring";

const SCREENS = [
  { href: "/", label: "Landing" },
  { href: "/register", label: "Registration" },
  { href: "/link", label: "Link generated" },
  { href: "/resume", label: "Consent + OTP" },
  { href: "/test", label: "Test" },
  { href: "/results", label: "Results" },
  { href: "/pricing", label: "Pricing" },
  { href: "/report-preview", label: "Report" },
];

/**
 * Presenter tool, not part of the product flow — nothing links here.
 * Loads a pre-filled persona so a demo can jump straight to the interesting
 * screens instead of tapping through 36 questions.
 */
export default function DemoPage() {
  const router = useRouter();
  const { session, hydrated, updateSession, resetSession } = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  function loadPersona(persona: Persona, destination: "/results" | "/test") {
    setBusy(`${persona.id}:${destination}`);

    const registration = {
      parentName: persona.parentName,
      parentMobile: persona.parentMobile,
      childName: persona.childName,
      childClass: persona.childClass,
      sessionToken: generateMockToken(),
      consentGiven: true,
      otpVerified: true,
      orderId: undefined,
      selectedTiers: {
        detailedReport: false,
        roadmap: false,
        consultation: false,
      },
    };

    if (destination === "/test") {
      // Registered and verified, but the test itself is untouched.
      updateSession({
        ...registration,
        responses: {},
        scores: undefined,
        completedAt: undefined,
      });
    } else {
      const responses = buildResponses(persona);
      updateSession({
        ...registration,
        responses,
        scores: scoreResponses(responses),
        completedAt: new Date().toISOString(),
      });
    }

    router.push(destination);
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
        <p className="text-note text-text-muted">Presenter tool</p>
        <h1 className="mt-3 text-h1 font-semibold text-text">Demo personas</h1>
        <p className="mt-4 text-lead text-text-secondary">
          Load a pre-filled answer set to skip the 36 questions. Not linked from
          anywhere in the product — this page exists for demos only.
        </p>

        <div className="mt-12 space-y-6">
          {PERSONAS.map((persona) => {
            const scores = scoreResponses(buildResponses(persona));
            return (
              <Card key={persona.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-h3 font-semibold text-text">
                    {persona.childName}
                    <span className="ml-3 font-sans text-note font-normal text-text-muted">
                      {persona.childClass}
                    </span>
                  </h2>
                  <span className="font-mono text-note text-text-secondary">
                    {getHollandCode(scores)}
                  </span>
                </div>

                <p className="mt-3 text-body text-text-secondary">
                  {persona.blurb}
                </p>
                <p className="mt-2 text-note text-text-muted">
                  Should rank: {persona.expectedTop}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => loadPersona(persona, "/results")}
                    loading={busy === `${persona.id}:/results`}
                    loadingText="Loading"
                    className="w-full sm:w-auto"
                  >
                    Load answers, view results
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => loadPersona(persona, "/test")}
                    loading={busy === `${persona.id}:/test`}
                    loadingText="Loading"
                    className="w-full sm:w-auto"
                  >
                    Registered, start test
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card tone="quiet" className="mt-10">
          <h2 className="text-h3 font-semibold text-text">Jump to any screen</h2>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {SCREENS.map((screen) => (
              <li key={screen.href}>
                <Link
                  href={screen.href}
                  className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-surface px-4 text-note text-text hover:border-brand-700"
                >
                  {screen.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-hairline pt-6">
            <p className="text-body text-text-secondary">
              Current session:{" "}
              {!hydrated
                ? "loading"
                : session.childName
                  ? `${session.childName}, ${
                      session.scores ? "test complete" : "test not finished"
                    }`
                  : "empty"}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetSession}
              className="mt-4"
            >
              Clear session
            </Button>
          </div>
        </Card>
      </main>

      <SiteFooter />
    </>
  );
}
