"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthExpiredError, fetchWards, logout, type WardSummary } from "@/lib/api/auth";
import { fetchSessionByToken } from "@/lib/api/realSession";
import { clearStoredAuthToken, getStoredAuthToken } from "@/lib/auth/client";
import { useSession } from "@/lib/context/SessionContext";
import type { RiasecType } from "@/types";

const STATUS_LABELS: Record<WardSummary["status"], string> = {
  REGISTERED: "Not started",
  IN_PROGRESS: "In progress",
  TIMED_OUT: "Paused",
  COMPLETED: "Completed",
};

export default function WardsPage() {
  const router = useRouter();
  const { session, updateSession } = useSession();

  const [wards, setWards] = useState<WardSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);
  const [openingToken, setOpeningToken] = useState<string>();

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      router.replace("/signin");
      return;
    }
    try {
      setWards(await fetchWards(token));
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        clearStoredAuthToken();
        router.replace("/signin");
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Could not load your wards.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    const token = getStoredAuthToken();
    setLoggingOut(true);
    if (token) await logout(token);
    clearStoredAuthToken();
    router.push("/");
  }

  /** "View results" pulls the server's copy into this tab's session, same
   *  merge rule app/resume/page.tsx's rehydration effect uses. */
  async function handleViewResults(ward: WardSummary) {
    setOpeningToken(ward.sessionToken);
    try {
      const server = await fetchSessionByToken(ward.sessionToken);
      if (!server) {
        setLoadError("Could not open that result.");
        return;
      }
      updateSession({
        sessionToken: server.sessionToken,
        parentName: server.parentName,
        parentMobile: server.parentMobile,
        childName: server.childName,
        childClass: server.childClass,
        childClassOther: server.childClassOther,
        consentGiven: server.consentGiven,
        otpVerified: server.otpVerified,
        schoolCode: server.schoolCode,
        schoolId: server.schoolId,
        classId: server.classId,
        parentStatedPreference: server.parentStatedPreference,
        responses: { ...server.responses, ...session.responses },
        scores: server.scores as Record<RiasecType, number> | undefined,
        completedAt: server.completedAt,
      });
      router.push("/results");
    } catch {
      setLoadError("Could not open that result. Please try again.");
    } finally {
      setOpeningToken(undefined);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h1 font-semibold text-text">Your wards</h1>
            <p className="mt-4 text-lead text-text-secondary">
              Every child you have registered, in one place.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 self-start"
            onClick={handleLogout}
            loading={loggingOut}
            loadingText="Signing out"
          >
            Log out
          </Button>
        </div>

        {loadError && (
          <p role="alert" className="mt-8 text-note text-err-700">
            {loadError}
          </p>
        )}

        {wards === null && !loadError && (
          <div aria-hidden="true" className="mt-10 animate-pulse space-y-4">
            <div className="h-24 rounded-xl bg-surface-sunk" />
            <div className="h-24 rounded-xl bg-surface-sunk" />
          </div>
        )}

        {wards?.length === 0 && (
          <Card className="mt-10">
            <p className="text-body text-text-secondary">
              No registrations found on this number yet.
            </p>
          </Card>
        )}

        <div className="mt-10 space-y-5">
          {wards?.map((ward) => (
            <Card key={ward.sessionToken}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-h3 font-semibold text-text">{ward.childName}</h2>
                  <p className="mt-1 text-note text-text-secondary">
                    {ward.childClass === "Other" && ward.childClassOther ? ward.childClassOther : ward.childClass}
                    {ward.schoolCode ? ` · ${ward.schoolCode}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-note font-medium text-brand-800">
                  {STATUS_LABELS[ward.status]}
                </span>
              </div>

              <p className="mt-4 text-note text-text-muted">
                {ward.status === "COMPLETED"
                  ? `Completed ${ward.completedAt ? new Date(ward.completedAt).toLocaleDateString() : ""}`
                  : `${ward.answeredCount} of ${ward.totalQuestions} questions answered`}
              </p>

              <div className="mt-6">
                {ward.status === "COMPLETED" ? (
                  <Button
                    onClick={() => handleViewResults(ward)}
                    loading={openingToken === ward.sessionToken}
                    loadingText="Opening"
                  >
                    View results
                  </Button>
                ) : (
                  <ButtonLink href={`/resume?t=${ward.sessionToken}`}>
                    Resume RIASEC test (question {ward.answeredCount + 1} of {ward.totalQuestions})
                  </ButtonLink>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 border-t border-hairline pt-8">
          <ButtonLink href="/register" variant="secondary">
            Register a new ward
          </ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
