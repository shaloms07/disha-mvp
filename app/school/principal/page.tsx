"use client";

import { useCallback, useState } from "react";
import { BatchOnboardingPanel } from "@/components/school/BatchOnboardingPanel";
import { CognitiveBenchmark } from "@/components/school/CognitiveBenchmark";
import { CompletionHeatmap } from "@/components/school/CompletionHeatmap";
import { StatTile, Toast } from "@/components/school/DashboardUi";
import { ScopeStrip } from "@/components/school/ScopeStrip";
import { DissonanceIndex } from "@/components/school/DissonanceIndex";
import { StreamDemandChart } from "@/components/school/StreamDemandChart";
import { WebinarTrigger } from "@/components/school/WebinarTrigger";
import {
  CLASS_COMPLETION,
  SCHOOL_TOTALS,
  dissonanceRows,
  summarise,
} from "@/lib/school/aggregates";
import { CLASSES } from "@/lib/school/schoolCode";

export default function PrincipalDashboardPage() {
  const [toast, setToast] = useState<string | null>(null);
  const dismiss = useCallback(() => setToast(null), [setToast]);

  const dissonance = summarise(dissonanceRows());
  const laggingSection = CLASS_COMPLETION.length
    ? CLASS_COMPLETION.reduce((a, b) => (b.percent < a.percent ? b : a))
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="text-note text-text-secondary">Principal</p>
          <h1 className="mt-1 text-h1 font-semibold text-text">
            Assessment overview
          </h1>
        </div>
        <WebinarTrigger onToast={setToast} />
      </div>

      <div className="mt-8">
        <ScopeStrip />
      </div>

      {/* The four figures a principal wants before scrolling anywhere. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Students onboarded"
          value={String(SCHOOL_TOTALS.students)}
          detail={`Across ${CLASSES.length} sections, classes 8 to 12`}
        />
        <StatTile
          label="Finished all four modules"
          value={`${SCHOOL_TOTALS.percent}%`}
          detail={`${SCHOOL_TOTALS.completed} of ${SCHOOL_TOTALS.students} students`}
        />
        <StatTile
          label="Part-way through"
          value={String(SCHOOL_TOTALS.inProgress)}
          detail={`${SCHOOL_TOTALS.notStarted} have not started at all`}
        />
        <StatTile
          label="Parent expectations diverging"
          value={`${dissonance.percent}%`}
          detail={`Of the ${dissonance.base} parents who named a career`}
          tone="alert"
        />
      </div>

      {laggingSection && (
        <p className="mt-4 text-note text-text-secondary">
          Slowest section right now is{" "}
          <strong className="font-medium text-text">
            {laggingSection.schoolClass.id}
          </strong>{" "}
          at {laggingSection.percent}% —{" "}
          {laggingSection.schoolClass.teacherName}&apos;s class.
        </p>
      )}

      <div className="mt-8 space-y-6">
        <CompletionHeatmap />

        <div className="grid gap-6 xl:grid-cols-2">
          <StreamDemandChart />
          <CognitiveBenchmark />
        </div>

        <DissonanceIndex />

        <BatchOnboardingPanel onToast={setToast} />
      </div>

      <Toast message={toast} onDismiss={dismiss} />
    </>
  );
}
