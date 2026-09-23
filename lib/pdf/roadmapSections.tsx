/**
 * Part II — Career Roadmap — page templates. These are the ONLY pages in
 * either PDF product that contain entrance exams, education routes, or
 * step-by-step career plans; lib/pdf/deepDiveSections.tsx (Part I, shared
 * with the standalone Deep-Dive Report) never renders this content. Used
 * exclusively by lib/pdf/DeepDiveRoadmapDocument.tsx, appended after the
 * same 12 Part I pages the standalone report uses.
 *
 * Part II is visually a distinct half of the document — a gold part badge on
 * every page, career titles on their own plate, pills for the concrete
 * artefacts (exams, routes, subjects, skills) — while sharing Part I's page
 * chrome so the two halves still read as one report.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors } from "./theme";
import {
  PdfAlignmentBand,
  PdfArrow,
  PdfCallout,
  PdfChecklist,
  PdfChip,
  PdfEducationPathway,
  PdfFooter,
  PdfHeader,
  PdfNumberBadge,
  PdfStageTimeline,
  PdfTitleRule,
  bandColor,
} from "./primitives";
import { PAGE_STYLE, REPORT_TITLE } from "./deepDiveSections";
import type { DeepDiveReportData } from "./deepDiveReportData";
import type { RoadmapCareer, RoadmapReportData } from "./roadmapReportData";

const DISCLAIMER =
  "Career assessment results represent a snapshot of the student's responses and are intended to support career " +
  "exploration and planning. They should be considered alongside interests, academic performance, opportunities, " +
  "guidance and personal circumstances.";

const s = StyleSheet.create({
  h1: { fontSize: 19, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 6 },
  h2: { fontSize: 13.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  lede: { fontSize: 10.5, lineHeight: 1.6, color: pdfColors.inkMuted },
  body: { fontSize: 10, lineHeight: 1.62, color: pdfColors.ink },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 15, marginBottom: 7 },
  labelTick: { width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.gold },
  labelText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  partBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    backgroundColor: pdfColors.gold,
    letterSpacing: 1.4,
    borderRadius: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  /* transition page */
  transitionCard: {
    backgroundColor: pdfColors.accentDeep,
    borderRadius: 8,
    padding: 20,
    marginTop: 22,
    position: "relative",
    overflow: "hidden",
  },
  transitionTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.inkInverse, marginBottom: 10 },
  transitionBody: { fontSize: 10, lineHeight: 1.62, color: "#cfe0e4" },

  aheadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 7,
  },
  aheadText: { fontSize: 9.75, lineHeight: 1.5, color: pdfColors.ink, flex: 1, marginTop: 1 },

  /* comparison table */
  table: { marginTop: 10, borderRadius: 5, overflow: "hidden" },
  tableHeadRow: { flexDirection: "row", backgroundColor: pdfColors.accentDeep, paddingVertical: 9, paddingHorizontal: 9 },
  tableRow: { flexDirection: "row", paddingVertical: 17, paddingHorizontal: 9 },
  col1: { width: "17%", paddingRight: 7 },
  col2: { width: "16%", paddingRight: 7 },
  col3: { width: "17%", paddingRight: 7 },
  col4: { width: "17%", paddingRight: 7 },
  col5: { width: "16%", paddingRight: 7 },
  col6: { width: "17%" },
  tableHeadText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableCellTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.ink, lineHeight: 1.35 },
  tableCellText: { fontSize: 8.5, lineHeight: 1.45, color: pdfColors.inkMuted },
  tableBandPill: {
    fontSize: 6.75,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
    letterSpacing: 0.3,
  },

  /* career roadmap pages */
  careerPlate: {
    backgroundColor: pdfColors.panelAccent,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.accent,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  careerHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  careerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roadmapBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accentMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  careerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  careerDesc: { fontSize: 9.75, lineHeight: 1.55, color: pdfColors.inkMuted, marginTop: 8 },

  pageBadgeRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },

  keyAreaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap" },
  pill: {
    fontSize: 8.5,
    color: pdfColors.ink,
    backgroundColor: pdfColors.panel,
    borderWidth: 0.75,
    borderColor: pdfColors.hairline,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginRight: 6,
    marginBottom: 6,
  },
  subjectSkillRow: { flexDirection: "row", gap: 18, marginTop: 2 },
  subjectSkillCol: { flex: 1 },

  skillTable: { marginTop: 6, borderRadius: 5, overflow: "hidden" },
  skillHeadRow: { flexDirection: "row", backgroundColor: pdfColors.accentDeep, paddingVertical: 8, paddingHorizontal: 10 },
  skillRow: { flexDirection: "row", paddingVertical: 13, paddingHorizontal: 10, alignItems: "flex-start" },
  skillColName: { width: "26%", paddingRight: 8 },
  skillColRel: { width: "18%", paddingRight: 8 },
  skillColHow: { width: "56%" },
  skillHeadText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  skillCellText: { fontSize: 8.25, lineHeight: 1.42, color: pdfColors.inkMuted },
  skillCellName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, lineHeight: 1.35 },
  relevancePill: {
    fontSize: 6.75,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
    letterSpacing: 0.3,
  },

  missingNote: { fontSize: 8.5, color: pdfColors.inkFaint, fontStyle: "italic" },

  milestoneRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 },
  milestoneArrow: { marginHorizontal: 5, marginBottom: 6 },

  disclaimerBox: {
    marginTop: 18,
    borderRadius: 6,
    padding: 13,
    backgroundColor: pdfColors.panel,
    borderWidth: 0.75,
    borderColor: pdfColors.hairlineStrong,
  },
  disclaimerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  disclaimerTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disclaimerText: { fontSize: 8.5, lineHeight: 1.5, color: pdfColors.inkMuted },
});

function Footer({ data }: { data: DeepDiveReportData }) {
  return <PdfFooter assessmentId={data.base.assessmentId} generatedOn={data.base.generatedOn} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={s.labelRow}>
      <View style={s.labelTick} />
      <Text style={s.labelText}>{children}</Text>
    </View>
  );
}

/* ==================================================== Part II transition */

export function RoadmapTransitionPage({ data }: { data: DeepDiveReportData }) {
  const ahead = [
    "A career overview and the assessment-backed reason each career appears here",
    `A visual education pathway, from where ${data.base.who} is now to an entry-level role`,
    "Relevant school subjects, skills to build, entrance exams and education routes",
    "A stage-by-stage roadmap and specific things to start doing this month",
  ];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <Text style={s.partBadge}>PART II — CAREER ROADMAP</Text>
      <PdfTitleRule />
      <Text style={s.h1}>From Assessment to Action</Text>
      <Text style={s.lede}>
        {data.base.who}&apos;s Deep-Dive assessment identifies career areas that align with the current profile. The
        next step is understanding how to actually explore and pursue these career paths.
      </Text>

      <View style={s.transitionCard}>
        <Text style={s.transitionTitle}>What This Section Does</Text>
        <Text style={s.transitionBody}>
          The pages that follow translate the assessment findings from Part I into practical educational and
          career-planning steps — for the specific careers that came out closest to {data.base.who}&apos;s profile.
          This section does not repeat the assessment; it builds on it.
        </Text>
        <View style={{ width: 54, height: 3, borderRadius: 1.5, backgroundColor: pdfColors.gold, marginTop: 16 }} />
      </View>

      <SectionLabel>What&apos;s Ahead</SectionLabel>
      {ahead.map((item, i) => (
        <View key={item} style={[s.aheadRow, { backgroundColor: pdfColors.decor[i].tint }]}>
          <PdfNumberBadge label={String(i + 1)} background={pdfColors.decor[i].base} size={17} />
          <Text style={s.aheadText}>{item}</Text>
        </View>
      ))}

      <Footer data={data} />
    </Page>
  );
}

/* =========================================== Part II career comparison */

export function RoadmapComparisonPage({ data, roadmap }: { data: DeepDiveReportData; roadmap: RoadmapReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Career Comparison" />
      <Text style={s.partBadge}>PART II — CAREER ROADMAP</Text>
      <PdfTitleRule />
      <Text style={s.h1}>Comparing Your Roadmap Careers</Text>
      <Text style={s.lede}>
        A side-by-side view of the career areas roadmapped in this report, before the detail on the pages that
        follow.
      </Text>

      <View style={s.table}>
        <View style={s.tableHeadRow}>
          <Text style={[s.tableHeadText, s.col1]}>Career</Text>
          <Text style={[s.tableHeadText, s.col2]}>Why It Matches</Text>
          <Text style={[s.tableHeadText, s.col3]}>Education Route</Text>
          <Text style={[s.tableHeadText, s.col4]}>Skill Focus</Text>
          <Text style={[s.tableHeadText, s.col5]}>Key Subjects</Text>
          <Text style={[s.tableHeadText, s.col6]}>Explore By</Text>
        </View>
        {roadmap.careers.map((rc, i) => (
          <View
            key={rc.career.id}
            style={[s.tableRow, { backgroundColor: i % 2 === 0 ? pdfColors.panel : pdfColors.page }]}
          >
            <Text style={[s.tableCellTitle, s.col1]}>{rc.career.title}</Text>
            <View style={s.col2}>
              <Text style={[s.tableBandPill, { backgroundColor: bandColor(rc.explanation.band) }]}>
                {rc.explanation.band.replace(" Alignment", "")}
              </Text>
            </View>
            <Text style={[s.tableCellText, s.col3]}>{rc.career.roadmap?.collegesOrPaths?.[0] ?? "Not yet available"}</Text>
            <Text style={[s.tableCellText, s.col4]}>
              {rc.career.roadmap?.skillsToDevelop?.slice(0, 2).join(", ") ?? "Not yet available"}
            </Text>
            <Text style={[s.tableCellText, s.col5]}>
              {rc.career.roadmap?.schoolSubjects?.slice(0, 2).join(", ") ?? "Not yet available"}
            </Text>
            <Text style={[s.tableCellText, s.col6]}>{rc.career.roadmap?.startNow?.[0] ?? "See roadmap page"}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.body, { color: pdfColors.inkFaint, fontSize: 8.25, marginTop: 14 }]}>
        Ranking reflects interest-profile alignment only, the dimension this assessment&apos;s matching engine
        computes — not a prediction of which career is objectively &quot;best&quot;.
      </Text>

      <Footer data={data} />
    </Page>
  );
}

/* ============================================== per-career roadmap pages */

function CareerHeader({ rc, roadmapIndex, total }: { rc: RoadmapCareer; roadmapIndex: number; total: number }) {
  return (
    <View style={s.careerPlate}>
      <View style={s.careerHeadRow}>
        <View>
          <Text style={s.roadmapBadge}>
            ROADMAP {String(roadmapIndex).padStart(2, "0")} OF {String(total).padStart(2, "0")}
          </Text>
          <View style={s.careerTitleRow}>
            <PdfNumberBadge label={String(roadmapIndex)} background={pdfColors.gold} size={20} />
            <Text style={s.careerTitle}>{rc.career.title}</Text>
          </View>
        </View>
        <PdfAlignmentBand band={rc.explanation.band} />
      </View>
      <Text style={s.careerDesc}>{rc.career.description}</Text>
    </View>
  );
}

/** Page A per career: overview, why it appears, education pathway, subjects & skills. */
export function RoadmapCareerOverviewPage({
  data,
  rc,
  roadmapIndex,
  total,
}: {
  data: DeepDiveReportData;
  rc: RoadmapCareer;
  roadmapIndex: number;
  total: number;
}) {
  const roadmap = rc.career.roadmap;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section={`Career Roadmap · ${rc.career.title}`} />
      <CareerHeader rc={rc} roadmapIndex={roadmapIndex} total={total} />

      <SectionLabel>Career Overview</SectionLabel>
      {roadmap?.workEnvironment ? (
        <Text style={s.body}>{roadmap.workEnvironment}</Text>
      ) : (
        <Text style={s.missingNote}>Typical work environment isn&apos;t yet available in the career database.</Text>
      )}
      {roadmap?.keyAreas?.length ? (
        <View style={s.keyAreaRow}>
          {roadmap.keyAreas.map((area, i) => (
            <PdfChip key={area} label={area} hue={i} />
          ))}
        </View>
      ) : null}

      <SectionLabel>Why This Career Appears in Your Profile</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>{rc.explanation.whyItAppears}</Text>
      </PdfCallout>
      <Text style={[s.body, { marginTop: 7, color: pdfColors.inkMuted, fontSize: 8.75 }]}>
        {data.careerSupportingContext}
      </Text>

      <SectionLabel>Education Pathway</SectionLabel>
      <PdfEducationPathway nodes={rc.pathway} />

      <View style={s.subjectSkillRow}>
        <View style={s.subjectSkillCol}>
          <SectionLabel>School Subjects</SectionLabel>
          {roadmap?.schoolSubjects?.length ? (
            <View style={s.pillRow}>
              {roadmap.schoolSubjects.map((subject, i) => (
                <PdfChip key={subject} label={subject} hue={i} />
              ))}
            </View>
          ) : (
            <Text style={s.missingNote}>Not yet available in the career database.</Text>
          )}
        </View>
        <View style={s.subjectSkillCol}>
          <SectionLabel>Skills to Develop</SectionLabel>
          {roadmap?.skillsToDevelop?.length ? (
            <View style={s.pillRow}>
              {roadmap.skillsToDevelop.map((skill, i) => (
                <PdfChip key={skill} label={skill} hue={i + 3} />
              ))}
            </View>
          ) : (
            <Text style={s.missingNote}>Not yet available in the career database.</Text>
          )}
        </View>
      </View>

      <Footer data={data} />
    </Page>
  );
}

function RoadmapPageBadge({ rc, roadmapIndex, total }: { rc: RoadmapCareer; roadmapIndex: number; total: number }) {
  return (
    <View style={s.pageBadgeRow}>
      <PdfNumberBadge label={String(roadmapIndex)} background={pdfColors.gold} size={16} />
      <Text style={s.roadmapBadge}>
        ROADMAP {String(roadmapIndex).padStart(2, "0")} OF {String(total).padStart(2, "0")} · {rc.career.title}
      </Text>
    </View>
  );
}

/** Page B per career: entrance/qualifications, education routes, and the stage-by-stage timeline. */
export function RoadmapCareerPlanPage({
  data,
  rc,
  roadmapIndex,
  total,
}: {
  data: DeepDiveReportData;
  rc: RoadmapCareer;
  roadmapIndex: number;
  total: number;
}) {
  const roadmap = rc.career.roadmap;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section={`Career Roadmap · ${rc.career.title}`} />
      <RoadmapPageBadge rc={rc} roadmapIndex={roadmapIndex} total={total} />

      <SectionLabel>Entrance Exams &amp; Eligibility</SectionLabel>
      {roadmap?.eligibility ? <Text style={[s.body, { marginBottom: 7 }]}>{roadmap.eligibility}</Text> : null}
      {roadmap?.exams?.length ? (
        <View style={s.pillRow}>
          {roadmap.exams.map((exam, i) => (
            <PdfChip key={exam} label={exam} hue={i + 2} />
          ))}
        </View>
      ) : (
        <Text style={s.missingNote}>Entrance requirements aren&apos;t yet available in the career database.</Text>
      )}

      <SectionLabel>Courses &amp; Education Routes</SectionLabel>
      {roadmap?.collegesOrPaths?.length ? (
        <>
          <View style={s.pillRow}>
            {roadmap.collegesOrPaths.map((path, i) => (
              <PdfChip key={path} label={path} hue={i + 5} />
            ))}
          </View>
          <PdfCallout tone="neutral">
            <Text style={[s.body, { fontSize: 9, color: pdfColors.inkMuted }]}>
              The options above range from a full degree program to shorter, more direct routes. A degree typically
              gives the broadest foundation and keeps the most doors open; shorter or self-directed routes can still
              work well when paired with strong, demonstrable projects.
            </Text>
          </PdfCallout>
        </>
      ) : (
        <Text style={s.missingNote}>Education routes aren&apos;t yet available in the career database.</Text>
      )}

      <SectionLabel>{`Step by Step${data.base.childName ? `, From ${data.base.childName}'s Grade` : ""}`}</SectionLabel>
      <PdfStageTimeline stages={rc.stages} />

      <Footer data={data} />
    </Page>
  );
}

/** Page C per career: what to start doing now, and the career's typical skill requirements. */
export function RoadmapCareerActionPage({
  data,
  rc,
  roadmapIndex,
  total,
}: {
  data: DeepDiveReportData;
  rc: RoadmapCareer;
  roadmapIndex: number;
  total: number;
}) {
  const roadmap = rc.career.roadmap;

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section={`Career Roadmap · ${rc.career.title}`} />
      <RoadmapPageBadge rc={rc} roadmapIndex={roadmapIndex} total={total} />

      <SectionLabel>Start Now</SectionLabel>
      {roadmap?.startNow?.length ? (
        <PdfChecklist items={roadmap.startNow} />
      ) : (
        <Text style={s.missingNote}>Specific starter activities aren&apos;t yet available in the career database.</Text>
      )}

      {rc.skillPlan.length > 0 && (
        <>
          <SectionLabel>Skill Development Plan</SectionLabel>
          <Text style={[s.body, { fontSize: 8.25, color: pdfColors.inkFaint, marginBottom: 2 }]}>
            Typical skill requirements for this career — not a claim about {data.base.who}&apos;s current level.
          </Text>
          <View style={s.skillTable}>
            <View style={s.skillHeadRow}>
              <Text style={[s.skillHeadText, s.skillColName]}>Skill</Text>
              <Text style={[s.skillHeadText, s.skillColRel]}>Career Relevance</Text>
              <Text style={[s.skillHeadText, s.skillColHow]}>How to Develop It</Text>
            </View>
            {rc.skillPlan.map((row, i) => (
              <View
                key={row.skill}
                style={[s.skillRow, { backgroundColor: i % 2 === 0 ? pdfColors.panel : pdfColors.page }]}
              >
                <Text style={[s.skillCellName, s.skillColName]}>{row.skill}</Text>
                <View style={s.skillColRel}>
                  <Text
                    style={[
                      s.relevancePill,
                      { backgroundColor: row.relevance === "High" ? pdfColors.decor[4].base : pdfColors.decor[7].base },
                    ]}
                  >
                    {row.relevance}
                  </Text>
                </View>
                <Text style={[s.skillCellText, s.skillColHow]}>{row.howToDevelop}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Footer data={data} />
    </Page>
  );
}

/* ==================================================== combined final page */

/** The Deep-Dive + Roadmap Report's own closing page — distinct from Part I's
 *  ConclusionPage, which only transitions into Part II rather than closing
 *  the whole document. */
export function CombinedNextStepsPage({ data, roadmap }: { data: DeepDiveReportData; roadmap: RoadmapReportData }) {
  const careerTitles = roadmap.careers.map((rc) => rc.career.title);
  const immediateActions = roadmap.careers
    .flatMap((rc) => rc.career.roadmap?.startNow?.slice(0, 1) ?? [])
    .slice(0, 4);
  const milestoneLabels = roadmap.careers[0]?.stages.map((st) => st.title) ?? [];

  return (
    <Page size="A4" style={PAGE_STYLE}>
      <PdfHeader reportTitle={REPORT_TITLE} section="Your Next Steps" />
      <Text style={s.partBadge}>PART II — CAREER ROADMAP</Text>
      <PdfTitleRule />
      <Text style={s.h1}>Your Next Steps</Text>

      <SectionLabel>Key Assessment Insights</SectionLabel>
      {data.profileStrengths.slice(0, 3).map((item, i) => (
        <View key={item} style={[s.aheadRow, { backgroundColor: pdfColors.decor[i].tint }]}>
          <PdfNumberBadge label={String(i + 1)} background={pdfColors.decor[i].base} size={17} />
          <Text style={s.aheadText}>{item}</Text>
        </View>
      ))}

      <SectionLabel>Career Areas to Explore</SectionLabel>
      <PdfCallout tone="accent">
        <Text style={s.body}>
          {careerTitles.join(", ")} — each with its own roadmap in Part II of this report.
        </Text>
      </PdfCallout>

      <SectionLabel>Immediate Actions</SectionLabel>
      <PdfChecklist items={immediateActions} />

      <SectionLabel>Roadmap Milestones</SectionLabel>
      {/* Drawn arrows rather than an arrow glyph — Helvetica has none, and a
          text arrow prints as stray punctuation. */}
      <View style={s.milestoneRow}>
        {milestoneLabels.map((label, i) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
            <PdfChip label={label} hue={i} />
            {i < milestoneLabels.length - 1 ? (
              <View style={s.milestoneArrow}>
                <PdfArrow direction="right" length={12} color={pdfColors.accentMuted} />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={s.disclaimerBox}>
        <View style={s.disclaimerTitleRow}>
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: pdfColors.hairlineStrong }} />
          <Text style={s.disclaimerTitle}>A Note on This Report</Text>
        </View>
        <Text style={s.disclaimerText}>{DISCLAIMER}</Text>
      </View>

      <Footer data={data} />
    </Page>
  );
}
