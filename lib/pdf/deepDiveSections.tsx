/**
 * The 12 page templates for the standalone Deep-Dive Assessment Report
 * (lib/pdf/DeepDiveDocument.tsx). Each export is a whole <Page> so nothing
 * splits mid-section. These same components are reused, unmodified, by the
 * Deep-Dive + Roadmap Report (lib/pdf/DeepDiveRoadmapDocument.tsx), which
 * appends its own additional roadmap pages afterward — see
 * lib/pdf/roadmapSections.tsx. This report is an interpretation document:
 * every section moves from the number to what it may mean, not a reprint of
 * the dashboard's score cards.
 *
 * On layout: a <Page> whose content exceeds the printable area does not clip —
 * it silently becomes two pages, and the report is no longer 12 pages (or 24
 * for the combined report). Content length here is data-driven, so when
 * changing spacing or type size, check the longest case as well as a typical
 * one: the most variable pages are 8, 11 and 12, whose lists are produced by
 * rules in lib/pdf/reportInterpretation.ts rather than fixed in the template.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RIASEC_TYPES, SJT_TRAITS } from "@/types";
import { pdfColors } from "./theme";
import {
  PdfAlignmentBand,
  PdfBar,
  PdfCallout,
  PdfCoverBanner,
  PdfCoverFooterBand,
  PdfDivider,
  PdfFooter,
  PdfHeader,
  PdfMeterLine,
  PdfNumberBadge,
  PdfPillarFlow,
  PdfRadar,
  PdfRing,
  PdfTitleRule,
  bandColor,
} from "./primitives";
import { behaviorNarrative } from "./reportInterpretation";
import type { DeepDiveReportData } from "./deepDiveReportData";

export const PAGE_STYLE = { paddingTop: 60, paddingBottom: 64, paddingHorizontal: 44 };
export const REPORT_TITLE = "DISHA · DEEP-DIVE ASSESSMENT REPORT";

/** The four pillars, in the order the report introduces them — used for the glance cards. */
const GLANCE_TONE = [
  pdfColors.riasec.I,
  pdfColors.riasec.R,
  pdfColors.riasec.S,
  pdfColors.riasec.E,
];

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  h2: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 6 },
  lede: { fontSize: 10.5, lineHeight: 1.55, color: pdfColors.inkMuted },
  body: { fontSize: 9.75, lineHeight: 1.6, color: pdfColors.ink },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 7,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 7 },
  labelRowTight: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
  labelText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  labelTick: { width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold },

  bullet: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 9,
    alignItems: "flex-start",
    backgroundColor: pdfColors.panel,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: pdfColors.gold, marginTop: 5 },
  bulletPlain: { flexDirection: "row", marginBottom: 7, gap: 9, alignItems: "flex-start" },
  bulletText: { fontSize: 9.5, lineHeight: 1.52, color: pdfColors.ink, flex: 1 },

  /* --- page 1 --- */
  metaRow: { flexDirection: "row", marginTop: 18, gap: 10 },
  metaCard: {
    flex: 1,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 2.5,
    borderLeftColor: pdfColors.accent,
  },
  metaLabel: { fontSize: 7, color: pdfColors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 4 },

  glanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  glanceCard: {
    width: "48%",
    minHeight: 68,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    overflow: "hidden",
  },
  glanceCap: { height: 3, width: "100%" },
  glanceInner: { paddingVertical: 9, paddingHorizontal: 12 },
  glanceLabel: { fontSize: 7, color: pdfColors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6 },
  glanceValue: { fontSize: 9.5, lineHeight: 1.4, color: pdfColors.ink, marginTop: 4 },

  /* --- page 8 uses a row form of the same data --- */
  glanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    paddingVertical: 7.5,
    paddingHorizontal: 12,
    marginBottom: 5,
  },
  glanceRowLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    width: 112,
  },
  glanceRowValue: { fontSize: 9.25, color: pdfColors.ink, flex: 1 },

  /* --- page 2 --- */
  dimensionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  dimensionCard: {
    width: "48%",
    minHeight: 106,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    overflow: "hidden",
  },
  dimensionCap: { height: 3, width: "100%" },
  dimensionInner: { paddingVertical: 10, paddingHorizontal: 12 },
  dimensionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 5 },
  dimensionText: { fontSize: 9.25, lineHeight: 1.5, color: pdfColors.inkMuted },

  /* --- page 3 --- */
  radarWrap: { alignItems: "center", marginTop: 4 },
  rankRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  rankCol: { flex: 1, borderRadius: 5, backgroundColor: pdfColors.panel, overflow: "hidden" },
  rankCap: { height: 3, width: "100%" },
  rankInner: { paddingVertical: 9, paddingHorizontal: 11 },
  rankOrdinal: { fontSize: 7, color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  rankLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  rankScore: { fontSize: 8, color: pdfColors.inkFaint, marginTop: 2 },
  codeStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    backgroundColor: pdfColors.accentDeep,
    borderRadius: 6,
    paddingVertical: 14,
  },
  codeLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#7fb3bd", textTransform: "uppercase", letterSpacing: 1.2 },
  codeLetterBox: {
    width: 26,
    height: 28,
    borderRadius: 4,
    backgroundColor: pdfColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  codeLetter: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.inkInverse },

  /* --- page 5 --- */
  ringPlate: {
    backgroundColor: pdfColors.panel,
    borderRadius: 6,
    paddingVertical: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  ringRow: { flexDirection: "row", justifyContent: "center", gap: 22 },

  /* --- page 9 --- */
  careerBlock: {
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginBottom: 4,
  },
  careerHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  careerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  careerTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  careerPercent: { fontSize: 7.25, color: pdfColors.inkFaint },
  careerMeterRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  careerText: { fontSize: 8.6, lineHeight: 1.42, color: pdfColors.inkMuted, marginTop: 2 },
  careerTextLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 6,
  },
  careerMeterWrap: { width: 54 },

  /* --- page 10: table --- */
  table: { marginTop: 10, borderRadius: 5, overflow: "hidden" },
  tableHeadRow: { flexDirection: "row", backgroundColor: pdfColors.accentDeep, paddingVertical: 9, paddingHorizontal: 10 },
  tableRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 10 },
  colCareer: { width: "22%", paddingRight: 10 },
  colAlign: { width: "20%", paddingRight: 10 },
  colWhy: { width: "30%", paddingRight: 10 },
  colExplore: { width: "28%" },
  tableHeadText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableCellTitle: { fontSize: 9.25, fontFamily: "Helvetica-Bold", color: pdfColors.ink, lineHeight: 1.35 },
  tableCellText: { fontSize: 8.5, lineHeight: 1.45, color: pdfColors.inkMuted },
  tableBandPill: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
    letterSpacing: 0.3,
  },

  /* --- page 11 --- */
  devBlock: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  /* The rules can produce anywhere from one signal to eight. Past four, the
     card chrome alone would push this page onto a second sheet, so the same
     content drops to an unpadded list — see DevelopmentAreasPage. */
  devBlockCompact: { flexDirection: "row", gap: 10, marginBottom: 11 },
  devNoteCompact: { fontSize: 9.25, lineHeight: 1.5, color: pdfColors.ink },
  devEyebrow: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    backgroundColor: pdfColors.accentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
  },
  devHeadline: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 5, marginBottom: 4 },

  /* --- page 12 --- */
  roadmapBox: {
    borderRadius: 6,
    padding: 13,
    marginTop: 12,
    backgroundColor: pdfColors.panelAccent,
    borderWidth: 0.75,
    borderColor: pdfColors.accent,
  },
  roadmapTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  roadmapTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.accent },
});

function Footer({ data }: { data: DeepDiveReportData }) {
  return <PdfFooter assessmentId={data.base.assessmentId} generatedOn={data.base.generatedOn} />;
}

/** A small-caps section label with a gold tick — the repeating rhythm of the document. */
function SectionLabel({ children, tight = false }: { children: string; tight?: boolean }) {
  return (
    <View style={tight ? s.labelRowTight : s.labelRow}>
      <View style={s.labelTick} />
      <Text style={s.labelText}>{children}</Text>
    </View>
  );
}

/** `plain` drops the tinted row — used where a page already carries tinted blocks. */
function Bullets({ items, plain = false }: { items: string[]; plain?: boolean }) {
  return (
    <View>
      {items.map((item, i) => {
        const hue = pdfColors.decor[i % pdfColors.decor.length];
        return (
          <View
            key={item}
            style={plain ? s.bulletPlain : [s.bullet, { backgroundColor: hue.tint }]}
          >
            <View style={[s.bulletDot, { backgroundColor: hue.base }]} />
            <Text style={s.bulletText}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================ page 1 ==== */

export function CoverSummaryPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfCoverBanner eyebrow="DISHA CAREER ASSESSMENT" title="DEEP-DIVE ASSESSMENT REPORT" />

      <View style={s.metaRow}>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Student</Text>
          <Text style={s.metaValue}>{data.base.childName || "—"}</Text>
        </View>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Assessment date</Text>
          <Text style={s.metaValue}>{data.base.generatedOn}</Text>
        </View>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Report ID</Text>
          <Text style={s.metaValue}>{data.base.assessmentId}</Text>
        </View>
      </View>

      <SectionLabel>Your Profile at a Glance</SectionLabel>
      <View style={s.glanceGrid}>
        {data.profileGlance.map((row, i) => (
          <View key={row.label} style={s.glanceCard}>
            <View style={[s.glanceCap, { backgroundColor: GLANCE_TONE[i % GLANCE_TONE.length] }]} />
            <View style={s.glanceInner}>
              <Text style={s.glanceLabel}>{row.label}</Text>
              <Text style={s.glanceValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionLabel>Executive Summary</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{data.executiveSummary}</Text>
      </PdfCallout>

      <PdfCoverFooterBand />

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 2 ==== */

export function HowToReadPage({ data }: { data: DeepDiveReportData }) {
  const dimensions = [
    {
      title: "Vocational Interest",
      text: "What kinds of activities and environments naturally attract you — not what you're good at, but what tends to hold your attention.",
    },
    {
      title: "Cognitive Aptitude",
      text: "The pattern across numerical, verbal and spatial reasoning tasks on this assessment — a snapshot, not a fixed ceiling.",
    },
    {
      title: "Behavioral Profile",
      text: "General response tendencies relevant to study and work — how you tend to approach structure, people and pressure.",
    },
    {
      title: "Work Values",
      text: "What you may value in a future work environment — the things that make a role feel worthwhile beyond the work itself.",
    },
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="How to Read Your Results" />
      <PdfTitleRule />
      <Text style={s.h1}>How to Read Your Results</Text>
      <Text style={s.lede}>
        This assessment looks at four separate dimensions. Each is scored on its own, and each tells a different
        part of the story — none of them on its own is a complete picture.
      </Text>

      <View style={s.dimensionGrid}>
        {dimensions.map((dimension, i) => (
          <View key={dimension.title} style={s.dimensionCard}>
            <View style={[s.dimensionCap, { backgroundColor: GLANCE_TONE[i % GLANCE_TONE.length] }]} />
            <View style={s.dimensionInner}>
              <Text style={s.dimensionTitle}>{dimension.title}</Text>
              <Text style={s.dimensionText}>{dimension.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <PdfDivider />
      <Text style={s.body}>
        Career matching later in this report should be understood as a combination of patterns across these four
        dimensions, not a single score. The diagram below is how this report builds toward the career areas on page 9.
      </Text>

      <View style={{ marginTop: 16 }}>
        <PdfPillarFlow inputs={["INTEREST", "APTITUDE", "BEHAVIOR", "VALUES"]} output="CAREER EXPLORATION" />
      </View>

      <PdfDivider />
      <SectionLabel tight>Methodology &amp; Limitations</SectionLabel>
      <PdfCallout tone="neutral">
        <Text style={s.body}>
          Results reflect responses given at one point in time, and interests, reasoning and behavior all continue to
          develop through the school years. This is a self-report and performance-based assessment for exploration and
          conversation — not a clinical, medical or diagnostic instrument, and not a guarantee of future performance in
          any field.
        </Text>
      </PdfCallout>

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
    labelColor: pdfColors.riasecInk[type],
  }));
  const [first, second, third] = data.base.interestRows;
  const ordinals = [
    { row: first, word: "Primary" },
    { row: second, word: "Secondary" },
    { row: third, word: "Third" },
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Vocational Interest Profile" />
      <PdfTitleRule />
      <Text style={s.h1}>Vocational Interest Profile</Text>
      <Text style={s.lede}>
        Realistic, Investigative, Artistic, Social, Enterprising and Conventional — your own scores, ranked strongest
        first.
      </Text>

      <View style={s.radarWrap}>
        <PdfRadar axes={axes} size={248} />
      </View>

      <View style={{ marginTop: 4 }}>
        {data.base.interestRows.map((row, i) => (
          <PdfBar
            key={row.type}
            label={row.label}
            value={row.score}
            max={row.max}
            color={pdfColors.riasec[row.type]}
            swatch={pdfColors.riasec[row.type]}
            strong={i === 0}
            valueLabel={`${row.score}/${row.max}`}
          />
        ))}
      </View>

      <View style={s.rankRow}>
        {ordinals.map(({ row, word }) => (
          <View key={word} style={s.rankCol}>
            <View style={[s.rankCap, { backgroundColor: pdfColors.riasec[row.type] }]} />
            <View style={s.rankInner}>
              <Text style={s.rankOrdinal}>{word}</Text>
              <Text style={s.rankLabel}>{row.label}</Text>
              <Text style={s.rankScore}>
                {row.score}/{row.max} · {row.percent}%
              </Text>
              <View style={{ marginTop: 6 }}>
                <PdfMeterLine percent={row.percent} color={pdfColors.riasec[row.type]} />
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={s.codeStrip}>
        <Text style={s.codeLabel}>Holland Code:</Text>
        {data.base.hollandCode.split("").map((letter, i) => {
          const type = letter as keyof typeof pdfColors.riasec;
          return (
            <View
              key={`${letter}-${i}`}
              style={[s.codeLetterBox, { backgroundColor: pdfColors.riasec[type] ?? pdfColors.accent }]}
            >
              <Text style={s.codeLetter}>{letter}</Text>
            </View>
          );
        })}
      </View>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 4 ==== */

export function InterestInterpretationPage({ data }: { data: DeepDiveReportData }) {
  const { interest } = data;
  const blocks = [
    { label: "What This Suggests", text: `${data.base.who} tends to enjoy ${interest.enjoys}.` },
    { label: "Types of Problems You May Enjoy", text: `${interest.problemTypes}.` },
    { label: "Environments That May Appeal", text: `${interest.environments}.` },
    { label: "Environments That May Feel Less Engaging", text: `${interest.lessEngaging}.` },
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Understanding Your Interest Profile" />
      <PdfTitleRule />
      <Text style={s.h1}>Understanding Your Interest Profile</Text>
      <Text style={s.lede}>{interest.headline} — here&apos;s what that combination tends to suggest.</Text>

      <View style={{ marginTop: 14 }}>
        {blocks.map((block, i) => (
          <View key={block.label} style={{ marginBottom: 10 }}>
            <SectionLabel tight>{block.label}</SectionLabel>
            <PdfCallout tone={i === 0 ? "accent" : "neutral"}>
              <Text style={s.body}>{block.text}</Text>
            </PdfCallout>
          </View>
        ))}
      </View>

      <SectionLabel>What This May Look Like in Practice</SectionLabel>
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
      <PdfTitleRule />
      <Text style={s.h1}>Cognitive Aptitude</Text>
      <Text style={s.lede}>Fifteen right/wrong questions across three reasoning domains, scored for accuracy.</Text>

      <View style={s.ringPlate}>
        <View style={s.ringRow}>
          {data.base.aptitudeRows.map((row) => (
            <PdfRing
              key={row.domain}
              value={row.value}
              max={row.max}
              label={row.label}
              caption={`${row.value}/${row.max} correct`}
              color={pdfColors.aptitudeHue[row.domain]}
              size={106}
            />
          ))}
        </View>
      </View>

      <SectionLabel tight>The Pattern</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{aptitude.pattern}</Text>
      </PdfCallout>

      <SectionLabel>Relative Strengths</SectionLabel>
      <Bullets items={aptitude.strengths} />

      <SectionLabel>Areas to Develop</SectionLabel>
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
    color: pdfColors.traitHue[trait],
  }));
  const top = data.base.behavioralRows.slice(0, 2);

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Behavioral / Personality Profile" />
      <PdfTitleRule />
      <Text style={s.h1}>Behavioral / Personality Profile</Text>
      <Text style={s.lede}>
        Thirty scenario-based questions across the five OCEAN traits — Openness, Conscientiousness, Extraversion,
        Agreeableness, Neuroticism.
      </Text>

      <View style={s.radarWrap}>
        <PdfRadar axes={axes} size={228} />
      </View>

      {/* The tick at 50 marks the midpoint of each trait's possible range —
          the only fixed point these min-max normalised scores can be read against. */}
      <View style={{ marginTop: 2 }}>
        {data.base.behavioralRows.map((row, i) => (
          <PdfBar
            key={row.trait}
            label={row.label}
            value={row.percent}
            max={100}
            valueLabel={`${row.percent}%`}
            color={pdfColors.traitHue[row.trait]}
            swatch={pdfColors.traitHue[row.trait]}
            strong={i === 0}
            reference={50}
          />
        ))}
      </View>

      <SectionLabel tight>What Your Profile May Suggest</SectionLabel>
      {top.map((row) => (
        <View key={row.trait} style={{ marginBottom: 7 }}>
          <PdfCallout tone="neutral">
            <Text style={s.body}>{behaviorNarrative(row.trait, row.percent)}</Text>
          </PdfCallout>
        </View>
      ))}

      {data.base.attentionOk === false && (
        <PdfCallout tone="warn">
          <Text style={[s.body, { color: pdfColors.warn, fontSize: 8.5 }]}>
            Note: this module&apos;s data-quality check wasn&apos;t answered as instructed, so these results should be read
            as indicative rather than precise.
          </Text>
        </PdfCallout>
      )}

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 7 ==== */

export function WorkValuesPage({ data }: { data: DeepDiveReportData }) {
  const { workValues } = data;
  /* A colour per row, cycled. These fifteen are not a scale and not a grouping,
     so the colour is variety rather than encoding — the written label names
     each one and the bar length plus the printed rating carry the value. */
  const fillFor = (index: number) => pdfColors.cycle[index % pdfColors.cycle.length];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="What Motivates You" />
      <PdfTitleRule />
      <Text style={s.h1}>What Motivates You</Text>
      <Text style={s.lede}>
        Fifteen values, each self-rated from 1 (Unimportant) to 5 (Essential) — ranked strongest first.
      </Text>

      <View style={{ marginTop: 10 }}>
        {data.base.workValueRows.map((row, i) => (
          <PdfBar
            key={row.key}
            label={row.label}
            value={row.value}
            max={5}
            valueLabel={`${row.value}/5`}
            color={fillFor(i)}
            swatch={fillFor(i)}
            strong={i === 0}
          />
        ))}
      </View>

      <SectionLabel tight>Your Top Motivators</SectionLabel>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {workValues.top.map((v, i) => (
          <View
            key={v.label}
            style={{
              flex: 1,
              backgroundColor: pdfColors.decor[i % pdfColors.decor.length].tint,
              borderWidth: 0.75,
              borderColor: pdfColors.decor[i % pdfColors.decor.length].base,
              borderRadius: 5,
              paddingVertical: 9,
              paddingHorizontal: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PdfNumberBadge
                label={String(i + 1)}
                background={pdfColors.decor[i % pdfColors.decor.length].base}
                size={15}
              />
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.ink, flex: 1 }}>
                {`${v.label} (${v.value}/5)`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <SectionLabel>What May Matter to You in a Career</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{workValues.whatMayMatter}</Text>
      </PdfCallout>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 8 ==== */

export function IntegratedProfilePage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Integrated Career Profile" />
      <PdfTitleRule />
      <Text style={s.h1}>Integrated Career Profile</Text>
      <Text style={s.lede}>Bringing the four pillars together into one profile.</Text>

      <View style={{ marginTop: 12 }}>
        {data.profileGlance.map((row, i) => (
          <View
            key={row.label}
            style={[s.glanceRow, { borderLeftWidth: 2.5, borderLeftColor: GLANCE_TONE[i % GLANCE_TONE.length] }]}
          >
            <Text style={s.glanceRowLabel}>{row.label}</Text>
            <Text style={s.glanceRowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>What This Combination Suggests</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{data.integratedNarrative}</Text>
      </PdfCallout>

      <SectionLabel>Profile Strengths</SectionLabel>
      <Bullets items={data.profileStrengths} plain />

      <SectionLabel>Areas to Develop</SectionLabel>
      <Bullets items={data.developmentSignals.slice(0, 4).map((sig) => sig.shortNote)} plain />

      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 9 ==== */

export function CareerMatchingPage({ data }: { data: DeepDiveReportData }) {
  /* The top match keeps the reserved gold. The rest start past amber in the
     decorative palette, so no runner-up gets a tint close enough to gold to be
     mistaken for the leader. */
  const rankHue = (i: number) => pdfColors.decor[(i + 3) % pdfColors.decor.length];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Career Matching" />
      <PdfTitleRule />
      <Text style={s.h1}>Career Matching</Text>
      <Text style={[s.body, { marginBottom: 2 }]}>{data.careerSupportingContext}</Text>

      <View style={{ marginTop: 8 }}>
        {data.careerExplanations.map((ex, i) => (
          <View
            key={ex.career.id}
            style={[
              s.careerBlock,
              {
                backgroundColor: i === 0 ? pdfColors.goldSoft : rankHue(i).tint,
                borderWidth: i === 0 ? 0.75 : 0,
                borderColor: pdfColors.goldLine,
              },
            ]}
          >
            <View style={s.careerHeadRow}>
              <View style={s.careerTitleRow}>
                <PdfNumberBadge
                  label={String(ex.career.rank).padStart(2, "0")}
                  background={i === 0 ? pdfColors.gold : rankHue(i).base}
                  size={17}
                />
                <Text style={s.careerTitle}>{ex.career.title}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <PdfAlignmentBand band={ex.band} />
                <View style={s.careerMeterRow}>
                  <View style={s.careerMeterWrap}>
                    <PdfMeterLine percent={ex.career.matchPercent} color={bandColor(ex.band)} />
                  </View>
                  <Text style={s.careerPercent}>{ex.career.matchPercent}% interest-profile alignment</Text>
                </View>
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
      <PdfTitleRule />
      <Text style={s.h1}>Career Comparison</Text>
      <Text style={s.lede}>Career areas worth exploring, compared side by side — not a guaranteed prediction.</Text>

      <View style={s.table}>
        <View style={s.tableHeadRow}>
          <Text style={[s.tableHeadText, s.colCareer]}>Career</Text>
          <Text style={[s.tableHeadText, s.colAlign]}>Interest Alignment</Text>
          <Text style={[s.tableHeadText, s.colWhy]}>Why It Appears</Text>
          <Text style={[s.tableHeadText, s.colExplore]}>Worth Exploring If…</Text>
        </View>
        {data.careerExplanations.map((ex, i) => (
          <View
            key={ex.career.id}
            style={[s.tableRow, { backgroundColor: i % 2 === 0 ? pdfColors.panel : pdfColors.page }]}
          >
            <Text style={[s.tableCellTitle, s.colCareer]}>{ex.career.title}</Text>
            <View style={s.colAlign}>
              <Text style={[s.tableBandPill, { backgroundColor: bandColor(ex.band) }]}>
                {ex.band.replace(" Alignment", "")}
              </Text>
            </View>
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
  const compact = data.developmentSignals.length > 4;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Areas to Develop" />
      <PdfTitleRule />
      <Text style={s.h1}>Areas to Develop</Text>
      <Text style={s.lede}>
        Based on {data.base.childName || "your"} own results — not a generic list, and not weaknesses, just places with
        genuine room to grow.
      </Text>

      <View style={{ marginTop: 12 }}>
        {data.developmentSignals.map((sig, i) => (
          <View
            key={sig.category}
            style={
              compact
                ? s.devBlockCompact
                : [s.devBlock, { backgroundColor: pdfColors.decor[i % pdfColors.decor.length].tint }]
            }
          >
            <PdfNumberBadge
              label={String(i + 1)}
              background={pdfColors.decor[i % pdfColors.decor.length].base}
              size={compact ? 17 : 19}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[s.devEyebrow, { backgroundColor: pdfColors.decor[i % pdfColors.decor.length].base }]}
              >
                {sig.category}
              </Text>
              <Text style={s.devHeadline}>{sig.headline}</Text>
              <Text style={compact ? s.devNoteCompact : s.body}>{sig.longNote}</Text>
            </View>
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
      <PdfTitleRule />
      <Text style={s.h1}>Conclusion &amp; Next Step</Text>

      <SectionLabel tight>Your Profile in One View</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{data.integratedNarrative}</Text>
      </PdfCallout>

      <SectionLabel>Key Takeaways</SectionLabel>
      <View>
        {keyTakeaways.map((item, i) => (
          <View
            key={item}
            style={{
              flexDirection: "row",
              gap: 9,
              alignItems: "flex-start",
              backgroundColor: pdfColors.decor[i % pdfColors.decor.length].tint,
              borderRadius: 4,
              paddingVertical: 6.5,
              paddingHorizontal: 10,
              marginBottom: 5,
            }}
          >
            <PdfNumberBadge
              label={String(i + 1)}
              background={pdfColors.decor[i % pdfColors.decor.length].base}
              size={15}
            />
            <Text style={[s.bulletText, { marginTop: 1 }]}>{item}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>What to Do Next</SectionLabel>
      <Bullets items={nextSteps} plain />

      {showRoadmapUpsell && (
        <View style={s.roadmapBox}>
          <View style={s.roadmapTitleRow}>
            <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold }} />
            <Text style={s.roadmapTitle}>Career Roadmap</Text>
          </View>
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
          <View style={s.roadmapTitleRow}>
            <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold }} />
            <Text style={s.roadmapTitle}>Your Career Roadmap Follows</Text>
          </View>
          <Text style={s.body}>{roadmapTransitionNote}</Text>
        </View>
      )}

      <Footer data={data} />
    </Page>
  );
}
