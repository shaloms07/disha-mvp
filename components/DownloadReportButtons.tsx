"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadPdfDocument, slugForFilename } from "@/lib/pdf/download";
import { buildDeepDiveReportData } from "@/lib/pdf/deepDiveReportData";
import { DeepDiveDocument } from "@/lib/pdf/DeepDiveDocument";
import { DeepDiveRoadmapDocument } from "@/lib/pdf/DeepDiveRoadmapDocument";
import type { DeepAptitudeDomain, DeepWorkValue, RiasecType, SjtTrait } from "@/types";

const CAREER_COUNT = 5;

interface Props {
  childName: string;
  orderId?: string;
  scores: Record<RiasecType, number>;
  aptitudeScores: Record<DeepAptitudeDomain, number>;
  sjtScores: Record<SjtTrait, number>;
  workValueScores: Record<DeepWorkValue, number>;
  attentionOk?: boolean;
  /** Which report this session actually bought — exactly one button renders, matching it. */
  hasRoadmap: boolean;
}

/**
 * Renders the client's own PDF from the data already on screen — no server
 * round trip, since this app has no backend to render it on (SessionState
 * lives only in sessionStorage). Report A (standalone) and Report B
 * (+ Roadmap) are built from the exact same underlying data — see
 * lib/pdf/deepDiveReportData.ts — so the two stay consistent with each
 * other and with whatever the student answered.
 */
export function DownloadReportButtons({
  childName,
  orderId,
  scores,
  aptitudeScores,
  sjtScores,
  workValueScores,
  attentionOk,
  hasRoadmap,
}: Props) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleDownload() {
    setStatus("working");
    try {
      const data = buildDeepDiveReportData({
        childName,
        orderId,
        scores,
        aptitudeScores,
        sjtScores,
        workValueScores,
        attentionOk,
        careerCount: CAREER_COUNT,
        includeRoadmap: hasRoadmap,
      });

      const doc = hasRoadmap ? <DeepDiveRoadmapDocument data={data} /> : <DeepDiveDocument data={data} />;
      const suffix = hasRoadmap ? "deep-dive-roadmap" : "deep-dive";
      await downloadPdfDocument(doc, `disha-${slugForFilename(childName)}-${suffix}.pdf`);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        size="md"
        loading={status === "working"}
        loadingText="Preparing PDF…"
        onClick={handleDownload}
      >
        {hasRoadmap ? "Download Deep-Dive + Roadmap Report" : "Download Deep-Dive Assessment Report"}
      </Button>
      {status === "error" && (
        <p className="text-note text-err-700">Couldn&apos;t generate the PDF. Please try again.</p>
      )}
    </div>
  );
}
