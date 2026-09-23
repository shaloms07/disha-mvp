"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadPdfDocument, slugForFilename } from "@/lib/pdf/download";
import { buildDeepDiveReportData } from "@/lib/pdf/deepDiveReportData";
import { buildRoadmapReportData } from "@/lib/pdf/roadmapReportData";
import { DeepDiveDocument } from "@/lib/pdf/DeepDiveDocument";
import { DeepDiveRoadmapDocument } from "@/lib/pdf/DeepDiveRoadmapDocument";
import type { DeepAptitudeDomain, DeepWorkValue, RiasecType, SjtTrait } from "@/types";

const CAREER_COUNT = 5;
/** How many of those top matches get a full Part II roadmap — configurable, not every match. */
const ROADMAP_CAREER_COUNT = 3;

interface Props {
  childName: string;
  childClass?: string;
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
 * (+ Roadmap) are built from the exact same underlying assessment data — see
 * lib/pdf/deepDiveReportData.ts and lib/pdf/roadmapReportData.ts — so the two
 * products can never disagree with each other or with what the student
 * actually answered.
 */
export function DownloadReportButtons({
  childName,
  childClass,
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

      let doc;
      let suffix;
      if (hasRoadmap) {
        const roadmap = buildRoadmapReportData({
          base: data.base,
          studentScores: scores,
          childClass,
          roadmapCareerCount: ROADMAP_CAREER_COUNT,
        });
        doc = <DeepDiveRoadmapDocument data={data} roadmap={roadmap} />;
        suffix = "deep-dive-roadmap";
      } else {
        doc = <DeepDiveDocument data={data} />;
        suffix = "deep-dive";
      }

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
