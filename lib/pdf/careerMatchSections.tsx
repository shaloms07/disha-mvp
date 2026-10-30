/**
 * The three pages that make the ₹299 report a Career Match Report rather than
 * an interest profile alone (lib/pdf/InterestReportDocument.tsx): every career
 * ranked, stream direction with the subjects each stream involves, and a
 * roadmap preview for the top matches. All built from data the app already
 * ships - lib/matching.ts, lib/school/streams.ts and data/careers.json - see
 * lib/pdf/interestReportData.ts.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors } from "./theme";
import { PdfBar, PdfCallout, PdfFooter, PdfHeader, PdfSampleWatermark, PdfTitleRule } from "./primitives";
import { PAGE_STYLE } from "./deepDiveSections";
import type { InterestReportData } from "./interestReportData";

export const INTEREST_REPORT_TITLE = "MY LIFE COACH · CAREER MATCH REPORT";

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  lede: { fontSize: 10.5, lineHeight: 1.55, color: pdfColors.inkMuted },
  body: { fontSize: 9.5, lineHeight: 1.55, color: pdfColors.ink },
  small: { fontSize: 8.5, lineHeight: 1.5, color: pdfColors.inkMuted },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accent, letterSpacing: 0.8, textTransform: "uppercase" },

  topThree: { flexDirection: "row", gap: 10, marginTop: 14 },
  topCard: { flex: 1, backgroundColor: pdfColors.panel, borderRadius: 5, overflow: "hidden" },
  topCap: { height: 3, width: "100%", backgroundColor: pdfColors.gold },
  topInner: { paddingVertical: 9, paddingHorizontal: 11 },
  topRank: { fontSize: 7, color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  topTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  topText: { fontSize: 8.25, lineHeight: 1.45, color: pdfColors.inkMuted, marginTop: 3 },

  streamCard: { backgroundColor: pdfColors.panel, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  streamHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  streamTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  streamPct: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.accent },

  careerRow: { flexDirection: "row", gap: 8, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: pdfColors.hairline },
  careerName: { width: 150, fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  careerSubjects: { flex: 1, fontSize: 8.75, color: pdfColors.inkMuted },

  roadCard: { backgroundColor: pdfColors.panel, borderRadius: 5, marginBottom: 9, overflow: "hidden" },
  roadCap: { height: 3, width: "100%" },
  roadInner: { paddingVertical: 9, paddingHorizontal: 12 },
  roadTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 4 },
  roadLine: { flexDirection: "row", marginTop: 3 },
  roadKey: { width: 92, fontSize: 8.25, fontFamily: "Helvetica-Bold", color: pdfColors.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 },
  roadVal: { flex: 1, fontSize: 9, lineHeight: 1.45, color: pdfColors.ink },
});

const ROAD_TONES = [pdfColors.riasec.I, pdfColors.riasec.A, pdfColors.riasec.S];

function Footer({ data }: { data: InterestReportData }) {
  return <PdfFooter assessmentId={data.assessmentId} generatedOn={data.generatedOn} />;
}

function Label({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 7 }}>
      <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold }} />
      <Text style={s.label}>{children}</Text>
    </View>
  );
}

function possessive(who: string): string {
  return who.toLowerCase() === "you" ? "your" : `${who}'s`;
}

/* =============================================== careers, ranked ====== */

export function CareerMatchesPage({ data }: { data: InterestReportData }) {
  const top = data.careerMatches.slice(0, 3);
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="Career Matches" />
      <PdfTitleRule />
      <Text style={s.h1}>Careers That Match {possessive(data.who).replace(/^./, (c) => c.toUpperCase())} Interests</Text>
      <Text style={s.lede}>
        Every career in the My Life Coach library, ranked by how closely its interest profile matches{" "}
        {possessive(data.who)} six scores. A strong match means the day-to-day work lines up with what{" "}
        {data.who.toLowerCase() === "you" ? "you enjoy" : `${data.who} enjoys`} — not yet whether the ability is
        there too.
      </Text>

      <View style={s.topThree}>
        {top.map((career, i) => (
          <View key={career.id} style={s.topCard}>
            <View style={s.topCap} />
            <View style={s.topInner}>
              <Text style={s.topRank}>Match #{i + 1} · {career.stars}/10</Text>
              <Text style={s.topTitle}>{career.title}</Text>
              <Text style={s.topText}>{career.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Label>All Careers, Ranked</Label>
      <View>
        {data.careerMatches.map((career, i) => (
          <PdfBar
            key={career.id}
            label={`${i + 1}. ${career.title}`}
            value={career.stars}
            max={10}
            strong={i < 3}
            color={i < 3 ? pdfColors.accent : pdfColors.accentMuted}
            valueLabel={`${career.stars}/10`}
          />
        ))}
      </View>

      <Footer data={data} />
      {data.sample ? <PdfSampleWatermark /> : null}
    </Page>
  );
}

/* ======================================= stream and subjects ========== */

export function StreamSubjectsPage({ data }: { data: InterestReportData }) {
  const [lead] = data.streams;
  const top = data.careerMatches.slice(0, 6);
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="Stream & Subjects" />
      <PdfTitleRule />
      <Text style={s.h1}>Stream Direction & Subject Choices</Text>
      <Text style={s.lede}>
        The stream choice after Class 10 decides which careers stay open. Here is how {possessive(data.who)}{" "}
        interests line up with each stream, and the school subjects the top career matches call for.
      </Text>

      <PdfCallout tone="gold" style={{ marginTop: 12 }}>
        <Text style={s.body}>
          Strongest fit: <Text style={{ fontFamily: "Helvetica-Bold" }}>{lead.title}</Text> ({lead.percent}% match).{" "}
          {lead.description}
        </Text>
      </PdfCallout>

      <Label>All Streams</Label>
      {data.streams.map((stream) => (
        <View key={stream.id} style={s.streamCard}>
          <View style={s.streamHead}>
            <Text style={s.streamTitle}>{stream.title}</Text>
            <Text style={s.streamPct}>{stream.percent}% match</Text>
          </View>
          <Text style={[s.small, { marginTop: 3 }]}>{stream.description}</Text>
        </View>
      ))}

      <Label>Subjects for the Top Career Matches</Label>
      {top.map((career) => {
        const subjects = career.schoolSubjects.length
          ? career.schoolSubjects.join(", ")
          : "See the full roadmap in the Complete Career Report";
        return (
          <View key={career.id} style={s.careerRow}>
            <Text style={s.careerName}>{career.title}</Text>
            <Text style={s.careerSubjects}>{subjects}</Text>
          </View>
        );
      })}
      <Text style={[s.small, { marginTop: 8 }]}>
        Stream direction is based on interests alone. A counsellor and the Complete Career Report also weigh
        aptitude and personality before a final choice.
      </Text>

      <Footer data={data} />
      {data.sample ? <PdfSampleWatermark /> : null}
    </Page>
  );
}

/* =========================================== roadmap preview ========== */

export function RoadmapPreviewPage({ data }: { data: InterestReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={INTEREST_REPORT_TITLE} section="Roadmap Preview" />
      <PdfTitleRule />
      <Text style={s.h1}>Roadmap Preview: Top {data.roadmapPreview.length} Careers</Text>
      <Text style={s.lede}>
        A first look at what each of the top matches takes — eligibility, entrance exams, courses and where to
        start. The Complete Career Report turns this into a full step-by-step plan.
      </Text>

      <View style={{ marginTop: 14 }}>
        {data.roadmapPreview.map((road, i) => (
          <View key={road.title} style={s.roadCard}>
            <View style={[s.roadCap, { backgroundColor: ROAD_TONES[i % ROAD_TONES.length] }]} />
            <View style={s.roadInner}>
              <Text style={s.roadTitle}>
                {i + 1}. {road.title}
              </Text>
              {road.eligibility ? (
                <View style={s.roadLine}>
                  <Text style={s.roadKey}>Eligibility</Text>
                  <Text style={s.roadVal}>{road.eligibility}</Text>
                </View>
              ) : null}
              {road.exams.length ? (
                <View style={s.roadLine}>
                  <Text style={s.roadKey}>Exams</Text>
                  <Text style={s.roadVal}>{road.exams.join(" · ")}</Text>
                </View>
              ) : null}
              {road.paths.length ? (
                <View style={s.roadLine}>
                  <Text style={s.roadKey}>Courses / paths</Text>
                  <Text style={s.roadVal}>{road.paths.join(" · ")}</Text>
                </View>
              ) : null}
              {road.firstSteps.length ? (
                <View style={s.roadLine}>
                  <Text style={s.roadKey}>Start with</Text>
                  <Text style={s.roadVal}>{road.firstSteps.map((step) => step.replace(/\.$/, "")).join(". ")}.</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <Footer data={data} />
      {data.sample ? <PdfSampleWatermark /> : null}
    </Page>
  );
}
