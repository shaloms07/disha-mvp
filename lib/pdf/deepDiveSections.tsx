/**
 * The 12 page templates for the standalone Deep-Dive Assessment Report
 * (lib/pdf/DeepDiveDocument.tsx). Each export is a whole <Page> so nothing
 * splits mid-section. These same components are reused, unmodified, by the
 * Deep-Dive + Roadmap Report (lib/pdf/DeepDiveRoadmapDocument.tsx), which
 * appends its own additional roadmap pages afterward — see
 * lib/pdf/roadmapSections.tsx. This report is an interpretation document:
 * every section moves from the number to what it may mean, not a reprint of
 * the dashboard's score cards.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RIASEC_TYPES, SJT_TRAITS } from "@/types";
import { pdfColors } from "./theme";
import {
  PdfAlignmentBand,
  PdfBar,
  PdfDivider,
  PdfFooter,
  PdfHeader,
  PdfPillarFlow,
  PdfRadar,
} from "./primitives";
import { behaviorNarrative } from "./reportInterpretation";
import type { DeepDiveReportData } from "./deepDiveReportData";

export const PAGE_STYLE = { paddingTop: 60, paddingBottom: 64, paddingHorizontal: 44 };
export const REPORT_TITLE = "DISHA · DEEP-DIVE ASSESSMENT REPORT";

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  h2: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 6 },
  lede: { fontSize: 10, lineHeight: 1.55, color: pdfColors.inkMuted },
  body: { fontSize: 9.5, lineHeight: 1.6, color: pdfColors.ink },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 16, marginBottom: 7 },
  bullet: { flexDirection: "row", marginBottom: 6, gap: 6 },
  bulletMark: { fontSize: 9.5, color: pdfColors.accent, width: 10 },
  bulletText: { fontSize: 9.25, lineHeight: 1.55, color: pdfColors.ink, flex: 1 },

  /* --- page 1 --- */
  coverTitleBlock: { marginTop: 4 },
  coverEyebrow: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.accent, letterSpacing: 2, marginBottom: 10 },
  coverTitle: { fontSize: 27, fontFamily: "Helvetica-Bold", color: pdfColors.ink, lineHeight: 1.15 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 20, borderTopWidth: 0.75, borderTopColor: pdfColors.hairline, paddingTop: 14 },
  metaCol: { width: "33%", marginBottom: 10 },
  metaLabel: { fontSize: 7.5, color: pdfColors.inkFaint, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  glanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 0.75, borderBottomColor: pdfColors.hairline },
  glanceLabel: { fontSize: 8.5, color: pdfColors.inkFaint, textTransform: "uppercase", letterSpacing: 0.4, width: 110 },
  glanceValue: { fontSize: 9.5, color: pdfColors.ink, flex: 1, textAlign: "right" },

  /* --- page 2 --- */
  dimensionRow: { marginBottom: 14 },
  dimensionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },

  /* --- page 3 --- */
  radarWrap: { alignItems: "center", marginTop: 6 },
  rankRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  rankCol: { width: "31%", borderWidth: 0.75, borderColor: pdfColors.hairline, borderRadius: 4, padding: 10 },
  rankOrdinal: { fontSize: 7.5, color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  rankLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  rankScore: { fontSize: 8, color: pdfColors.inkFaint, marginTop: 2 },
  codeStrip: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, gap: 8 },
  codeLetter: { fontSize: 20, fontFamily: "Helvetica-Bold", color: pdfColors.accent },

  /* --- page 9 --- */
  careerBlock: { paddingVertical: 10, borderBottomWidth: 0.75, borderBottomColor: pdfColors.hairline },
  careerHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  careerTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  careerRank: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.inkFaint },
  careerTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  careerPercent: { fontSize: 7.5, color: pdfColors.inkFaint, marginTop: 2 },
  careerText: { fontSize: 8.75, lineHeight: 1.45, color: pdfColors.inkMuted, marginTop: 5 },
  careerTextLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 5 },

  /* --- page 10: table --- */
  table: { marginTop: 6 },
  tableHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: pdfColors.ink, paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.75, borderBottomColor: pdfColors.hairline },
  colCareer: { width: "24%" },
  colAlign: { width: "18%" },
  colWhy: { width: "30%" },
  colExplore: { width: "28%" },
  tableHeadText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, textTransform: "uppercase", letterSpacing: 0.4 },
  tableCellTitle: { fontSize: 8.75, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  tableCellText: { fontSize: 7.75, lineHeight: 1.4, color: pdfColors.inkMuted },

  /* --- page 11 --- */
  devBlock: { marginBottom: 14 },
  devEyebrow: { fontSize: 7.75, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  devHeadline: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3, marginBottom: 4 },

  /* --- page 12 --- */
  takeawayCard: { backgroundColor: pdfColors.panel, borderRadius: 6, padding: 14, marginTop: 4 },
  roadmapBox: { borderWidth: 0.75, borderColor: pdfColors.accent, borderRadius: 6, padding: 14, marginTop: 18 },
  roadmapTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.accent, marginBottom: 6 },
});

function Footer({ data }: { data: DeepDiveReportData }) {
  return <PdfFooter assessmentId={data.base.assessmentId} generatedOn={data.base.generatedOn} />;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={s.bullet}>
          <Text style={s.bulletMark}>—</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/* ============================================================ page 1 ==== */

export function CoverSummaryPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <View style={s.coverTitleBlock}>
        <Text style={s.coverEyebrow}>DISHA CAREER ASSESSMENT</Text>
        <Text style={s.coverTitle}>DEEP-DIVE ASSESSMENT REPORT</Text>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaCol}>
          <Text style={s.metaLabel}>Student</Text>
          <Text style={s.metaValue}>{data.base.childName || "—"}</Text>
        </View>
        <View style={s.metaCol}>
          <Text style={s.metaLabel}>Assessment date</Text>
          <Text style={s.metaValue}>{data.base.generatedOn}</Text>
        </View>
        <View style={s.metaCol}>
          <Text style={s.metaLabel}>Report ID</Text>
          <Text style={s.metaValue}>{data.base.assessmentId}</Text>
        </View>
      </View>

      <Text style={s.label}>Your Profile at a Glance</Text>
      <View>
        {data.profileGlance.map((row) => (
          <View key={row.label} style={s.glanceRow}>
            <Text style={s.glanceLabel}>{row.label}</Text>
            <Text style={s.glanceValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Text style={s.label}>Executive Summary</Text>
      <Text style={s.body}>{data.executiveSummary}</Text>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 2 ==== */

export function HowToReadPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="How to Read Your Results" />
      <Text style={s.h1}>How to Read Your Results</Text>
      <Text style={s.lede}>
        This assessment looks at four separate dimensions. Each is scored on its own, and each tells a different
        part of the story — none of them on its own is a complete picture.
      </Text>

      <View style={s.dimensionRow}>
        <Text style={s.dimensionTitle}>Vocational Interest</Text>
        <Text style={s.body}>What kinds of activities and environments naturally attract you — not what you&apos;re good at, but what tends to hold your attention.</Text>
      </View>
      <View style={s.dimensionRow}>
        <Text style={s.dimensionTitle}>Cognitive Aptitude</Text>
        <Text style={s.body}>The pattern across numerical, verbal and spatial reasoning tasks on this assessment — a snapshot, not a fixed ceiling.</Text>
      </View>
      <View style={s.dimensionRow}>
        <Text style={s.dimensionTitle}>Behavioral Profile</Text>
        <Text style={s.body}>General response tendencies relevant to study and work — how you tend to approach structure, people and pressure.</Text>
      </View>
      <View style={s.dimensionRow}>
        <Text style={s.dimensionTitle}>Work Values</Text>
        <Text style={s.body}>What you may value in a future work environment — the things that make a role feel worthwhile beyond the work itself.</Text>
      </View>

      <PdfDivider />
      <Text style={s.body}>
        Career matching later in this report should be understood as a combination of patterns across these four
        dimensions, not a single score. The diagram below is how this report builds toward the career areas on page 9.
      </Text>

      <View style={{ marginTop: 18 }}>
        <PdfPillarFlow inputs={["INTEREST", "APTITUDE", "BEHAVIOR", "VALUES"]} output="CAREER EXPLORATION" />
      </View>

      <PdfDivider />
      <Text style={s.label}>Methodology &amp; Limitations</Text>
      <Text style={s.body}>
        Results reflect responses given at one point in time, and interests, reasoning and behavior all continue to
        develop through the school years. This is a self-report and performance-based assessment for exploration and
        conversation — not a clinical, medical or diagnostic instrument, and not a guarantee of future performance in
        any field.
      </Text>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 3 ==== */

export function InterestProfilePage({ data }: { data: DeepDiveReportData }) {
  const scoreByType = Object.fromEntries(data.base.interestRows.map((r) => [r.type, r]));
  const axes = RIASEC_TYPES.map((type) => ({
    key: type,
    label: type,
    value: scoreByType[type].score,
    max: scoreByType[type].max,
    color: pdfColors.riasec[type],
  }));
  const [first, second, third] = data.base.interestRows;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Vocational Interest Profile" />
      <Text style={s.h1}>Vocational Interest Profile</Text>
      <Text style={s.lede}>Realistic, Investigative, Artistic, Social, Enterprising and Conventional — your own scores, ranked strongest first.</Text>

      <View style={s.radarWrap}>
        <PdfRadar axes={axes} size={230} />
      </View>

      <View style={{ marginTop: 8 }}>
        {data.base.interestRows.map((row) => (
          <PdfBar key={row.type} label={row.label} value={row.score} max={row.max} color={pdfColors.riasec[row.type]} valueLabel={`${row.score}/${row.max}`} />
        ))}
      </View>

      <View style={s.rankRow}>
        <View style={s.rankCol}>
          <Text style={s.rankOrdinal}>Primary</Text>
          <Text style={s.rankLabel}>{first.label}</Text>
          <Text style={s.rankScore}>{first.score}/{first.max} · {first.percent}%</Text>
        </View>
        <View style={s.rankCol}>
          <Text style={s.rankOrdinal}>Secondary</Text>
          <Text style={s.rankLabel}>{second.label}</Text>
          <Text style={s.rankScore}>{second.score}/{second.max} · {second.percent}%</Text>
        </View>
        <View style={s.rankCol}>
          <Text style={s.rankOrdinal}>Third</Text>
          <Text style={s.rankLabel}>{third.label}</Text>
          <Text style={s.rankScore}>{third.score}/{third.max} · {third.percent}%</Text>
        </View>
      </View>

      <View style={s.codeStrip}>
        <Text style={s.rankOrdinal}>Holland Code:</Text>
        <Text style={s.codeLetter}>{data.base.hollandCode}</Text>
      </View>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 4 ==== */

export function InterestInterpretationPage({ data }: { data: DeepDiveReportData }) {
  const { interest } = data;
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Understanding Your Interest Profile" />
      <Text style={s.h1}>Understanding Your Interest Profile</Text>
      <Text style={s.lede}>{interest.headline} — here&apos;s what that combination tends to suggest.</Text>

      <Text style={s.label}>What This Suggests</Text>
      <Text style={s.body}>{data.base.who} tends to enjoy {interest.enjoys}.</Text>

      <Text style={s.label}>Types of Problems You May Enjoy</Text>
      <Text style={s.body}>{interest.problemTypes}.</Text>

      <Text style={s.label}>Environments That May Appeal</Text>
      <Text style={s.body}>{interest.environments}.</Text>

      <Text style={s.label}>Environments That May Feel Less Engaging</Text>
      <Text style={s.body}>{interest.lessEngaging}.</Text>

      <Text style={s.label}>What This May Look Like in Practice</Text>
      <Bullets items={interest.practiceExamples} />

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 5 ==== */

export function AptitudePage({ data }: { data: DeepDiveReportData }) {
  const { aptitude } = data;
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Cognitive Aptitude" />
      <Text style={s.h1}>Cognitive Aptitude</Text>
      <Text style={s.lede}>Fifteen right/wrong questions across three reasoning domains, scored for accuracy.</Text>

      <View style={{ marginTop: 10 }}>
        {data.base.aptitudeRows.map((row) => (
          <PdfBar key={row.domain} label={row.label} value={row.value} max={row.max} valueLabel={`${row.value}/${row.max} · ${row.percent}%`} />
        ))}
      </View>

      <Text style={s.label}>The Pattern</Text>
      <Text style={s.body}>{aptitude.pattern}</Text>

      <Text style={s.label}>Relative Strengths</Text>
      <Bullets items={aptitude.strengths} />

      <Text style={s.label}>Areas to Develop</Text>
      <Bullets items={aptitude.developAreas} />

      <PdfDivider />
      <Text style={[s.body, { color: pdfColors.inkFaint, fontSize: 8.5 }]}>
        This assessment measures reasoning patterns on the day it was taken — it is not an IQ test, and none of these
        domains are fixed. Regular practice changes these numbers over time.
      </Text>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 6 ==== */

export function BehavioralPage({ data }: { data: DeepDiveReportData }) {
  const scoreByTrait = Object.fromEntries(data.base.behavioralRows.map((r) => [r.trait, r]));
  const axes = SJT_TRAITS.map((trait) => ({
    key: trait,
    label: trait.slice(0, 1).toUpperCase(),
    value: scoreByTrait[trait].percent,
    max: 100,
    color: pdfColors.accent,
  }));
  const top = data.base.behavioralRows.slice(0, 2);

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Behavioral / Personality Profile" />
      <Text style={s.h1}>Behavioral / Personality Profile</Text>
      <Text style={s.lede}>Thirty scenario-based questions across the five OCEAN traits — Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.</Text>

      <View style={s.radarWrap}>
        <PdfRadar axes={axes} size={200} />
      </View>

      <View style={{ marginTop: 6 }}>
        {data.base.behavioralRows.map((row) => (
          <PdfBar key={row.trait} label={row.label} value={row.percent} max={100} valueLabel={`${row.percent}%`} />
        ))}
      </View>

      <Text style={s.label}>What Your Profile May Suggest</Text>
      {top.map((row) => (
        <Text key={row.trait} style={[s.body, { marginBottom: 8 }]}>
          {behaviorNarrative(row.trait, row.percent)}
        </Text>
      ))}

      {data.base.attentionOk === false && (
        <Text style={[s.body, { color: pdfColors.warn, fontSize: 8.5, marginTop: 4 }]}>
          Note: this module&apos;s data-quality check wasn&apos;t answered as instructed, so these results should be read
          as indicative rather than precise.
        </Text>
      )}

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 7 ==== */

export function WorkValuesPage({ data }: { data: DeepDiveReportData }) {
  const { workValues } = data;
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Work Values & Motivators" />
      <Text style={s.h1}>Work Values &amp; Motivators</Text>
      <Text style={s.lede}>Fifteen values, each self-rated from 1 (Unimportant) to 5 (Essential) — ranked strongest first.</Text>

      <View style={{ marginTop: 8 }}>
        {data.base.workValueRows.map((row) => (
          <PdfBar key={row.key} label={row.label} value={row.value} max={5} valueLabel={`${row.value}/5`} color={row.percent >= 80 ? pdfColors.accent : pdfColors.hairlineStrong} />
        ))}
      </View>

      <Text style={s.label}>Your Top Motivators</Text>
      <Bullets items={workValues.top.map((v) => `${v.label} (${v.value}/5)`)} />

      <Text style={s.label}>What May Matter to You in a Career</Text>
      <Text style={s.body}>{workValues.whatMayMatter}</Text>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 8 ==== */

export function IntegratedProfilePage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Integrated Career Profile" />
      <Text style={s.h1}>Integrated Career Profile</Text>
      <Text style={s.lede}>Bringing the four pillars together into one profile.</Text>

      <View style={{ marginTop: 4 }}>
        {data.profileGlance.map((row) => (
          <View key={row.label} style={s.glanceRow}>
            <Text style={s.glanceLabel}>{row.label}</Text>
            <Text style={s.glanceValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Text style={s.label}>What This Combination Suggests</Text>
      <Text style={s.body}>{data.integratedNarrative}</Text>

      <Text style={s.label}>Profile Strengths</Text>
      <Bullets items={data.profileStrengths} />

      <Text style={s.label}>Areas to Develop</Text>
      <Bullets items={data.developmentSignals.slice(0, 4).map((sig) => sig.shortNote)} />

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 9 ==== */

export function CareerMatchingPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Career Matching" />
      <Text style={s.h1}>Career Matching</Text>
      <Text style={[s.body, { marginBottom: 4 }]}>{data.careerSupportingContext}</Text>

      <View style={{ marginTop: 8 }}>
        {data.careerExplanations.map((ex) => (
          <View key={ex.career.id} style={s.careerBlock}>
            <View style={s.careerHeadRow}>
              <View style={s.careerTitleRow}>
                <Text style={s.careerRank}>{String(ex.career.rank).padStart(2, "0")}</Text>
                <Text style={s.careerTitle}>{ex.career.title}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <PdfAlignmentBand band={ex.band} />
                <Text style={s.careerPercent}>{ex.career.matchPercent}% interest-profile alignment</Text>
              </View>
            </View>
            <Text style={s.careerTextLabel}>Why It Appears</Text>
            <Text style={s.careerText}>{ex.whyItAppears}</Text>
            <Text style={s.careerTextLabel}>What to Explore</Text>
            <Text style={s.careerText}>{ex.whatToExplore}</Text>
          </View>
        ))}
      </View>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 10 === */

export function CareerComparisonPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Career Comparison" />
      <Text style={s.h1}>Career Comparison</Text>
      <Text style={s.lede}>Career areas worth exploring, compared side by side — not a guaranteed prediction.</Text>

      <View style={s.table}>
        <View style={s.tableHeadRow}>
          <Text style={[s.tableHeadText, s.colCareer]}>Career</Text>
          <Text style={[s.tableHeadText, s.colAlign]}>Interest Alignment</Text>
          <Text style={[s.tableHeadText, s.colWhy]}>Why It Appears</Text>
          <Text style={[s.tableHeadText, s.colExplore]}>Worth Exploring If…</Text>
        </View>
        {data.careerExplanations.map((ex) => (
          <View key={ex.career.id} style={s.tableRow}>
            <Text style={[s.tableCellTitle, s.colCareer]}>{ex.career.title}</Text>
            <Text style={[s.tableCellText, s.colAlign]}>{ex.band.replace(" Alignment", "")}</Text>
            <Text style={[s.tableCellText, s.colWhy]}>{ex.whyItAppears}</Text>
            <Text style={[s.tableCellText, s.colExplore]}>{ex.whatToExplore}</Text>
          </View>
        ))}
      </View>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 11 === */

export function DevelopmentAreasPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Areas to Develop" />
      <Text style={s.h1}>Areas to Develop</Text>
      <Text style={s.lede}>Based on {data.base.childName || "your"} own results — not a generic list, and not weaknesses, just places with genuine room to grow.</Text>

      <View style={{ marginTop: 8 }}>
        {data.developmentSignals.map((sig) => (
          <View key={sig.category} style={s.devBlock}>
            <Text style={s.devEyebrow}>{sig.category}</Text>
            <Text style={s.devHeadline}>{sig.headline}</Text>
            <Text style={s.body}>{sig.longNote}</Text>
          </View>
        ))}
      </View>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 12 === */

export function ConclusionPage({
  data,
  keyTakeaways,
  nextSteps,
  showRoadmapUpsell,
  roadmapTransitionNote,
}: {
  data: DeepDiveReportData;
  keyTakeaways: string[];
  nextSteps: string[];
  showRoadmapUpsell: boolean;
  roadmapTransitionNote?: string;
}) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Conclusion & Next Step" />
      <Text style={s.h1}>Conclusion &amp; Next Step</Text>

      <Text style={s.label}>Your Profile in One View</Text>
      <View style={s.takeawayCard}>
        <Text style={s.body}>{data.integratedNarrative}</Text>
      </View>

      <Text style={s.label}>Key Takeaways</Text>
      <Bullets items={keyTakeaways} />

      <Text style={s.label}>What to Do Next</Text>
      <Bullets items={nextSteps} />

      {showRoadmapUpsell && (
        <View style={s.roadmapBox}>
          <Text style={s.roadmapTitle}>Career Roadmap</Text>
          <Text style={s.body}>
            Students who want detailed guidance for pursuing their matched career areas can access the separate{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Deep-Dive Assessment + Career Roadmap</Text> report. It
            builds on this same assessment data and adds career-specific education pathways, entrance exams,
            courses, relevant qualifications, and a step-by-step progression plan for each matched career.
          </Text>
        </View>
      )}

      {!showRoadmapUpsell && roadmapTransitionNote && (
        <View style={s.roadmapBox}>
          <Text style={s.roadmapTitle}>Your Career Roadmap Follows</Text>
          <Text style={s.body}>{roadmapTransitionNote}</Text>
        </View>
      )}

      <Footer data={data} />
    </Page>
  );
}
