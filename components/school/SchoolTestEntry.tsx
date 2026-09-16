"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useSession } from "@/lib/context/SessionContext";
import { normalizeSchoolCode, resolveSchoolCode } from "@/lib/school/schoolCode";

/**
 * The client half of the branded entry link.
 *
 * The route validated the code before rendering this, so by the time it runs
 * the school is known. All it does is write the school and section onto the
 * session and hand off to the normal flow — it is an entry point, not the
 * test. A student cannot start before consent and mobile verification.
 */
export function SchoolTestEntry({ schoolCode }: { schoolCode: string }) {
  const router = useRouter();
  const { session, hydrated, updateSession } = useSession();

  const match = resolveSchoolCode(schoolCode);
  // A ref, not state: this fires once and must not itself cause a render.
  const handled = useRef(false);

  useEffect(() => {
    if (!hydrated || !match || handled.current) return;
    handled.current = true;

    // The same pair a typed school code writes. The link is a second way in,
    // not a second data path.
    updateSession({
      schoolCode: normalizeSchoolCode(schoolCode),
      schoolId: match.school.id,
      classId: match.schoolClass?.id,
    });

    // A registration already in this browser can go straight to consent;
    // otherwise the parent gives their details first. Opening the link on a
    // phone that has never seen it is the common case for a school rollout.
    const registered = Boolean(session.sessionToken && session.childName);
    router.replace(registered ? "/resume" : "/register");
  }, [hydrated, match, schoolCode, session, updateSession, router]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-20 text-center">
        <span
          aria-hidden="true"
          className="inline-block size-7 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
        />
        <p aria-live="polite" className="mt-7 text-h3 font-semibold text-text">
          {match?.school.name}
        </p>
        <p className="mt-2 text-body text-text-secondary">
          {match?.schoolClass
            ? `Setting up the test for section ${match.schoolClass.id}…`
            : "Setting up the test…"}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
