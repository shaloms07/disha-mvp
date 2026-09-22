/**
 * The additional pages that turn the standalone Deep-Dive Report into the
 * Deep-Dive + Career Roadmap Report (lib/pdf/DeepDiveRoadmapDocument.tsx).
 * Entrance exams, college paths and step-by-step plans live ONLY here —
 * never in lib/pdf/deepDiveSections.tsx, which the standalone report also
 * uses. Appended after the same 12 core pages, one page per matched career.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors } from "./theme";
import { PdfAlignmentBand, PdfFooter, PdfHeader } from "./primitives";
import { alignmentBandFor } from "./reportInterpretation";
import { PAGE_STYLE, REPORT_TITLE } from "./deepDiveSections";
import type { CareerRow } from "./reportData";
import type { DeepDiveReportData } from "./deepDiveReportData";

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  lede: { fontSize: 10, lineHeight: 1.55, color: pdfColors.inkMuted, marginBottom: 10 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  rank: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.inkFaint },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  desc: { fontSize: 9.5, lineHeight: 1.55, color: pdfColors.inkMuted, marginTop: 8 },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 16, marginBottom: 7 },
  pillRow: { flexDirection: "row", flexWrap: "wrap" },
  pill: {
    fontSize: 8,
    color: pdfColors.accent,
    backgroundColor: pdfColors.accentSoft,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  stepRow: { flexDirection: "row", marginBottom: 7, gap: 8 },
  stepIndex: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.accent, width: 16 },
  stepText: { fontSize: 9.25, lineHeight: 1.5, color: pdfColors.ink, flex: 1 },
});

export function RoadmapCareerPage({
  data,
  career,
  isFirst,
}: {
  data: DeepDiveReportData;
  career: CareerRow;
  isFirst: boolean;
}) {
  const roadmap = career.roadmap;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Career Roadmap" />
      {isFirst && (
        <>
          <Text style={s.h1}>Career Roadmap</Text>
          <Text style={s.lede}>
            Entrance exams, courses and a step-by-step plan for each of your top career matches — one page per
            career, closest match first.
          </Text>
        </>
      )}

      <View style={s.headRow}>
        <View style={s.titleRow}>
          <Text style={s.rank}>{String(career.rank).padStart(2, "0")}</Text>
          <Text style={s.title}>{career.title}</Text>
        </View>
        <PdfAlignmentBand band={alignmentBandFor(career.matchPercent)} />
      </View>
      <Text style={s.desc}>{career.description}</Text>

      {roadmap ? (
        <>
          <Text style={s.label}>Entrance Exams to Aim For</Text>
          <View style={s.pillRow}>
            {roadmap.exams.map((exam) => (
              <Text key={exam} style={s.pill}>{exam}</Text>
            ))}
          </View>

          <Text style={s.label}>Courses &amp; College Paths</Text>
          <View style={s.pillRow}>
            {roadmap.collegesOrPaths.map((path) => (
              <Text key={path} style={s.pill}>{path}</Text>
            ))}
          </View>

          <Text style={s.label}>Step by Step, From Now</Text>
          {roadmap.steps.map((step, i) => (
            <View key={step} style={s.stepRow}>
              <Text style={s.stepIndex}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={[s.desc, { marginTop: 14 }]}>
          A detailed roadmap isn&apos;t available for this career yet — treat the Career Matching and Career
          Comparison pages as the starting point for independent research instead.
        </Text>
      )}

      <PdfFooter assessmentId={data.base.assessmentId} generatedOn={data.base.generatedOn} />
    </Page>
  );
}
