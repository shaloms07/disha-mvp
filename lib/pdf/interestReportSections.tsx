/**
 * The 4 page templates for the Tier 1 "Download Report" PDF
 * (lib/pdf/InterestReportDocument.tsx). Shares its page chrome, type scale and
 * primitives with the Deep-Dive report (lib/pdf/deepDiveSections.tsx) so the
 * two read as the same product line at different depths, not a different
 * document entirely.
 *
 * Deliberately excludes career names or rankings - see
 * lib/pdf/interestReportData.ts's header. Page 4 exists specifically to make
 * that exclusion feel like a reason to upgrade rather than an omission.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RIASEC_TYPES } from "@/types";
import { pdfColors } from "./theme";
import {
  PdfBar,
  PdfCallout,
  PdfCoverBanner,
  PdfCoverFooterBand,
  PdfDivider,
  PdfFooter,
  PdfHeader,
  PdfMeterLine,
  PdfRadar,
  PdfTitleRule,
} from "./primitives";
import { PAGE_STYLE } from "./deepDiveSections";
import type { InterestReportData } from "./interestReportData";

export const INTEREST_REPORT_TITLE = "MY LIFE COACH · DOWNLOAD REPORT";

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  lede: { fontSize: 10.5, lineHeight: 1.55, color: pdfColors.inkMuted },
  body: { fontSize: 9.75, lineHeight: 1.6, color: pdfColors.ink },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 7 },
  labelRowTight: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
  labelTick: { width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold },

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

  rankRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  rankCol: { flex: 1, borderRadius: 5, backgroundColor: pdfColors.panel, overflow: "hidden" },
  rankCap: { height: 3, width: "100%" },
  rankInner: { paddingVertical: 9, paddingHorizontal: 11 },
  rankOrdinal: { fontSize: 7, color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  rankLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  rankScore: { fontSize: 8, color: pdfColors.inkFaint, marginTop: 2 },

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
  bulletText: { fontSize: 9.5, lineHeight: 1.52, color: pdfColors.ink, flex: 1 },

  /* --- page 4: upgrade --- */
  upgradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  upgradeCard: {
    width: "48%",
    minHeight: 92,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    overflow: "hidden",
  },
  upgradeCap: { height: 3, width: "100%" },
  upgradeInner: { paddingVertical: 10, paddingHorizontal: 12 },
  upgradeTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 5 },
  upgradeText: { fontSize: 9.25, lineHeight: 1.5, color: pdfColors.inkMuted },

  ctaBox: {
    borderRadius: 6,
    padding: 15,
    marginTop: 18,
    backgroundColor: pdfColors.panelAccent,
    borderWidth: 0.75,
    borderColor: pdfColors.accent,
  },
  ctaTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  ctaTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: pdfColors.accent },
});

const UPGRADE_TONE = [
  pdfColors.riasec.I,
  pdfColors.riasec.R,
  pdfColors.riasec.S,
  pdfColors.riasec.E,
];

function Footer({ data }: { data: InterestReportData }) {
  return <PdfFooter assessmentId={data.assessmentId} generatedOn={data.generatedOn} />;
}

function SectionLabel({ children, tight = false }: { children: string; tight?: boolean }) {
  return (
    <View style={tight ? s.labelRowTight : s.labelRow}>
      <View style={s.labelTick} />
      <Text style={s.label}>{children}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => {
        const hue = pdfColors.decor[i % pdfColors.decor.length];
        return (
          <View key={item} style={[s.bullet, { backgroundColor: hue.tint }]}>
            <View style={[s.bulletDot, { backgroundColor: hue.base }]} />
            <Text style={s.bulletText}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================ page 1 ==== */

export function InterestCoverPage({ data }: { data: InterestReportData }) {
  const [first, second] = data.interestRows;
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfCoverBanner eyebrow="MY LIFE COACH CAREER ASSESSMENT" title="INTEREST PROFILE REPORT" />

      <View style={s.metaRow}>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Student</Text>
          <Text style={s.metaValue}>{data.childName || "—"}</Text>
        </View>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Assessment date</Text>
          <Text style={s.metaValue}>{data.generatedOn}</Text>
        </View>
        <View style={s.metaCard}>
          <Text style={s.metaLabel}>Report ID</Text>
          <Text style={s.metaValue}>{data.assessmentId}</Text>
        </View>
      </View>

      <SectionLabel>What This Report Covers</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>
          Based on all 36 picks in the My Life Coach assessment, {data.who.toLowerCase() === "you" ? "your" : `${data.who}'s`}{" "}
          strongest interests are {first.label} and {second.label}. The pages that follow give the full six-type
          profile, what that combination tends to mean day-to-day, and where genuine strengths and growth angles sit
          within it.
        </Text>
      </PdfCallout>

      <SectionLabel>What This Report Is Not</SectionLabel>
      <PdfCallout tone="neutral">
        <Text style={s.body}>
          This is an interest profile, not a career plan — it describes what{" "}
          {data.who.toLowerCase() === "you" ? "you tend to" : `${data.who} tends to`} enjoy, not which specific
          careers fit best or how capable {data.who.toLowerCase() === "you" ? "you are" : `${data.who} is`}. Ranked
          career matches, cognitive aptitude, behavioral profile and work values are covered in the separate
          Deep-Dive Assessment — see the last page of this report.
        </Text>
      </PdfCallout>

      <PdfCoverFooterBand />
      <Footer data={data} />
    </Page>
  );
}

/* ============================================================ page 2 ==== */

export function InterestFullProfilePage({ data }: { data: InterestReportData }) {
  const scoreByType = Object.fromEntries(data.interestRows.map((r) => [r.type, r]));
  const axes = RIASEC_TYPES.map((type) => ({
    key: type,
    label: type,
    value: scoreByType[type].score,
    max: scoreByType[type].max,
    color: pdfColors.riasec[type],
    labelColor: pdfColors.riasecInk[type],
  }));
  const [first, second, third] = data.interestRows;
  const ordinals = [
    { row: first, word: "Primary" },
    { row: second, word: "Secondary" },
    { row: third, word: "Third" },
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="Interest Profile" />
      <PdfTitleRule />
      <Text style={s.h1}>Your Full Interest Profile</Text>
      <Text style={s.lede}>
        Realistic, Investigative, Artistic, Social, Enterprising and Conventional — all six scores, ranked strongest
        first.
      </Text>

      <View style={{ alignItems: "center", marginTop: 4 }}>
        <PdfRadar axes={axes} size={248} />
      </View>

      <View style={{ marginTop: 4 }}>
        {data.interestRows.map((row, i) => (
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
        {data.hollandCode.split("").map((letter, i) => {
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

/* ============================================================ page 3 ==== */

export function InterestStrengthsPage({ data }: { data: InterestReportData }) {
  const { interest } = data;
  const blocks = [
    { label: "What This Suggests", text: `${data.who} tends to enjoy ${interest.enjoys}.` },
    { label: "Types of Problems You May Enjoy", text: `${interest.problemTypes}.` },
    { label: "Environments That May Appeal", text: `${interest.environments}.` },
    { label: "Where Growth Takes More Conscious Effort", text: `${interest.lessEngaging}.` },
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="Strengths & Growth Angles" />
      <PdfTitleRule />
      <Text style={s.h1}>Strengths & Growth Angles</Text>
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

/* ============================================================ page 4 ==== */

const DEEP_DIVE_FEATURES = [
  {
    title: "Ranked Career Matches",
    text: "See exactly which careers best fit this profile, ranked with a percentage match score — not just a general interest direction.",
  },
  {
    title: "Cognitive Aptitude",
    text: "Fifteen right/wrong questions across numerical, verbal and spatial reasoning — a real measure of reasoning patterns.",
  },
  {
    title: "Behavioral / Personality Profile",
    text: "Thirty scenario-based questions across the five OCEAN traits — how this profile tends to approach structure, people and pressure.",
  },
  {
    title: "Work Values & Motivators",
    text: "Fifteen self-rated values — what would actually need to be true of a future role for it to feel worthwhile.",
  },
];

export function InterestUpgradePage({ data }: { data: InterestReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="What the Deep-Dive Adds" />
      <PdfTitleRule />
      <Text style={s.h1}>What the Deep-Dive Adds</Text>
      <Text style={s.lede}>
        This report told {data.who.toLowerCase() === "you" ? "you" : data.who} what{" "}
        {data.who.toLowerCase() === "you" ? "you&apos;re" : `${data.who} is`} drawn to. The Deep-Dive Assessment goes
        further — three more short modules that turn this interest profile into specific career areas worth
        exploring, plus a fuller picture of reasoning, behavior and motivation.
      </Text>

      <View style={s.upgradeGrid}>
        {DEEP_DIVE_FEATURES.map((feature, i) => (
          <View key={feature.title} style={s.upgradeCard}>
            <View style={[s.upgradeCap, { backgroundColor: UPGRADE_TONE[i % UPGRADE_TONE.length] }]} />
            <View style={s.upgradeInner}>
              <Text style={s.upgradeTitle}>{feature.title}</Text>
              <Text style={s.upgradeText}>{feature.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.ctaBox}>
        <View style={s.ctaTitleRow}>
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold }} />
          <Text style={s.ctaTitle}>Deep-Dive Assessment</Text>
        </View>
        <Text style={s.body}>
          Available as the next step on the results page this report was downloaded from — it builds on these exact
          same interest scores, so nothing needs to be retaken.
        </Text>
      </View>

      <PdfDivider />
      <Text style={[s.body, { color: pdfColors.inkFaint, fontSize: 8.5 }]}>
        This profile is a snapshot, not a verdict — interests keep developing through the school years, and this
        assessment is a self-report tool for exploration and conversation, not a clinical or diagnostic instrument.
      </Text>

      <Footer data={data} />
    </Page>
  );
}
