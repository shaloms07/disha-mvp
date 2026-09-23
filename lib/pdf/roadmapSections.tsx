/**
 * Part II — Career Roadmap — page templates. These are the ONLY pages in
 * either PDF product that contain entrance exams, education routes, or
 * step-by-step career plans; lib/pdf/deepDiveSections.tsx (Part I, shared
 * with the standalone Deep-Dive Report) never renders this content. Used
 * exclusively by lib/pdf/DeepDiveRoadmapDocument.tsx, appended after the
 * same 12 Part I pages the standalone report uses.
 */

import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfColors } from "./theme";
import {
  PdfAlignmentBand,
  PdfChecklist,
  PdfEducationPathway,
  PdfFooter,
  PdfHeader,
  PdfStageTimeline,
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
  lede: { fontSize: 10, lineHeight: 1.6, color: pdfColors.inkMuted },
  body: { fontSize: 9.5, lineHeight: 1.6, color: pdfColors.ink },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 15, marginBottom: 7 },
  partBadge: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfColors.accent, letterSpacing: 2, marginBottom: 8 },

  /* transition page */
  transitionCard: { backgroundColor: pdfColors.panel, borderRadius: 8, padding: 20, marginTop: 24 },
  transitionTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginBottom: 10 },
  bullet: { flexDirection: "row", marginBottom: 6, gap: 6 },
  bulletMark: { fontSize: 9.5, color: pdfColors.accent, width: 10 },
  bulletText: { fontSize: 9.25, lineHeight: 1.55, color: pdfColors.ink, flex: 1 },

  /* comparison table */
  table: { marginTop: 8 },
  tableHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: pdfColors.ink, paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.75, borderBottomColor: pdfColors.hairline },
  col1: { width: "16%" }, col2: { width: "16%" }, col3: { width: "17%" }, col4: { width: "17%" }, col5: { width: "17%" }, col6: { width: "17%" },
  tableHeadText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: pdfColors.ink, textTransform: "uppercase", letterSpacing: 0.3 },
  tableCellTitle: { fontSize: 8.25, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  tableCellText: { fontSize: 7.25, lineHeight: 1.35, color: pdfColors.inkMuted },

  /* career roadmap pages */
  careerHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roadmapBadge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accent, letterSpacing: 1, marginBottom: 4 },
  careerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  careerDesc: { fontSize: 9.5, lineHeight: 1.55, color: pdfColors.inkMuted, marginTop: 6 },
  keyAreaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  keyAreaPill: {
    fontSize: 7.75,
    color: pdfColors.accent,
    backgroundColor: pdfColors.accentSoft,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginRight: 5,
    marginBottom: 5,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap" },
  pill: {
    fontSize: 8,
    color: pdfColors.ink,
    borderWidth: 0.75,
    borderColor: pdfColors.hairlineStrong,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  subjectSkillRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  subjectSkillCol: { flex: 1 },

  skillTable: { marginTop: 6 },
  skillHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: pdfColors.ink, paddingBottom: 5, marginBottom: 3 },
  skillRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: pdfColors.hairline, alignItems: "flex-start" },
  skillColName: { width: "26%" }, skillColRel: { width: "18%" }, skillColHow: { width: "56%" },
  skillHeadText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: pdfColors.ink, textTransform: "uppercase", letterSpacing: 0.3 },
  skillCellText: { fontSize: 8, lineHeight: 1.4, color: pdfColors.inkMuted },
  skillCellName: { fontSize: 8.25, fontFamily: "Helvetica-Bold", color: pdfColors.ink },

  missingNote: { fontSize: 8, color: pdfColors.inkFaint, fontStyle: "italic" },

  disclaimerBox: {
    marginTop: 22,
    borderWidth: 0.75,
    borderColor: pdfColors.hairlineStrong,
    borderRadius: 6,
    padding: 13,
    backgroundColor: pdfColors.panel,
  },
  disclaimerTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.inkMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  disclaimerText: { fontSize: 8.25, lineHeight: 1.5, color: pdfColors.inkMuted },
});

function Footer({ data }: { data: DeepDiveReportData }) {
  return <PdfFooter assessmentId={data.base.assessmentId} generatedOn={data.base.generatedOn} />;
}

/* ==================================================== Part II transition */

export function RoadmapTransitionPage({ data }: { data: DeepDiveReportData }) {
  return (
    <Page size="A4" style={PAGE_STYLE}>
      <Text style={s.partBadge}>PART II — CAREER ROADMAP</Text>
      <Text style={s.h1}>From Assessment to Action</Text>
      <Text style={s.lede}>
        {data.base.who}&apos;s Deep-Dive assessment identifies career areas that align with the current profile. The
        next step is understanding how to actually explore and pursue these career paths.
      </Text>

      <View style={s.transitionCard}>
        <Text style={s.transitionTitle}>What This Section Does</Text>
        <Text style={s.body}>
          The pages that follow translate the assessment findings from Part I into practical educational and
          career-planning steps — for the specific careers that came out closest to {data.base.who}&apos;s profile.
          This section does not repeat the assessment; it builds on it.
        </Text>
      </View>

      <Text style={s.label}>What&apos;s Ahead</Text>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>A career overview and the assessment-backed reason each career appears here</Text>
      </View>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>A visual education pathway, from where {data.base.who} is now to an entry-level role</Text>
      </View>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>Relevant school subjects, skills to build, entrance exams and education routes</Text>
      </View>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>A stage-by-stage roadmap and specific things to start doing this month</Text>
      </View>

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
        {roadmap.careers.map((rc) => (
          <View key={rc.career.id} style={s.tableRow}>
            <Text style={[s.tableCellTitle, s.col1]}>{rc.career.title}</Text>
            <Text style={[s.tableCellText, s.col2]}>{rc.explanation.band.replace(" Alignment", "")}</Text>
            <Text style={[s.tableCellText, s.col3]}>{rc.career.roadmap?.collegesOrPaths?.[0] ?? "Not yet available"}</Text>
            <Text style={[s.tableCellText, s.col4]}>{rc.career.roadmap?.skillsToDevelop?.slice(0, 2).join(", ") ?? "Not yet available"}</Text>
            <Text style={[s.tableCellText, s.col5]}>{rc.career.roadmap?.schoolSubjects?.slice(0, 2).join(", ") ?? "Not yet available"}</Text>
            <Text style={[s.tableCellText, s.col6]}>{rc.career.roadmap?.startNow?.[0] ?? "See roadmap page"}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.body, { color: pdfColors.inkFaint, fontSize: 8, marginTop: 14 }]}>
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
    <View>
      <View style={s.careerHeadRow}>
        <View>
          <Text style={s.roadmapBadge}>ROADMAP {String(roadmapIndex).padStart(2, "0")} OF {String(total).padStart(2, "0")}</Text>
          <Text style={s.careerTitle}>{rc.career.title}</Text>
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

      <Text style={s.label}>Career Overview</Text>
      {roadmap?.workEnvironment ? (
        <Text style={s.body}>{roadmap.workEnvironment}</Text>
      ) : (
        <Text style={s.missingNote}>Typical work environment isn&apos;t yet available in the career database.</Text>
      )}
      {roadmap?.keyAreas?.length ? (
        <View style={s.keyAreaRow}>
          {roadmap.keyAreas.map((area) => (
            <Text key={area} style={s.keyAreaPill}>{area}</Text>
          ))}
        </View>
      ) : null}

      <Text style={s.label}>Why This Career Appears in Your Profile</Text>
      <Text style={s.body}>{rc.explanation.whyItAppears}</Text>
      <Text style={[s.body, { marginTop: 6, color: pdfColors.inkMuted, fontSize: 8.75 }]}>
        {data.careerSupportingContext}
      </Text>

      <Text style={s.label}>Education Pathway</Text>
      <PdfEducationPathway nodes={rc.pathway} />

      <View style={s.subjectSkillRow}>
        <View style={s.subjectSkillCol}>
          <Text style={s.label}>School Subjects</Text>
          {roadmap?.schoolSubjects?.length ? (
            <View style={s.pillRow}>
              {roadmap.schoolSubjects.map((subject) => (
                <Text key={subject} style={s.pill}>{subject}</Text>
              ))}
            </View>
          ) : (
            <Text style={s.missingNote}>Not yet available in the career database.</Text>
          )}
        </View>
        <View style={s.subjectSkillCol}>
          <Text style={s.label}>Skills to Develop</Text>
          {roadmap?.skillsToDevelop?.length ? (
            <View style={s.pillRow}>
              {roadmap.skillsToDevelop.map((skill) => (
                <Text key={skill} style={s.pill}>{skill}</Text>
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
    <Text style={s.roadmapBadge}>
      ROADMAP {String(roadmapIndex).padStart(2, "0")} OF {String(total).padStart(2, "0")} · {rc.career.title}
    </Text>
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

      <Text style={s.label}>Entrance Exams &amp; Eligibility</Text>
      {roadmap?.eligibility && <Text style={[s.body, { marginBottom: 5 }]}>{roadmap.eligibility}</Text>}
      {roadmap?.exams?.length ? (
        <View style={s.pillRow}>
          {roadmap.exams.map((exam) => (
            <Text key={exam} style={s.pill}>{exam}</Text>
          ))}
        </View>
      ) : (
        <Text style={s.missingNote}>Entrance requirements aren&apos;t yet available in the career database.</Text>
      )}

      <Text style={s.label}>Courses &amp; Education Routes</Text>
      {roadmap?.collegesOrPaths?.length ? (
        <>
          <View style={s.pillRow}>
            {roadmap.collegesOrPaths.map((path) => (
              <Text key={path} style={s.pill}>{path}</Text>
            ))}
          </View>
          <Text style={[s.body, { fontSize: 8.75, color: pdfColors.inkMuted }]}>
            The options above range from a full degree program to shorter, more direct routes. A degree typically
            gives the broadest foundation and keeps the most doors open; shorter or self-directed routes can still
            work well when paired with strong, demonstrable projects.
          </Text>
        </>
      ) : (
        <Text style={s.missingNote}>Education routes aren&apos;t yet available in the career database.</Text>
      )}

      <Text style={s.label}>Step by Step{data.base.childName ? `, From ${data.base.childName}'s Grade` : ""}</Text>
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

      <Text style={s.label}>Start Now</Text>
      {roadmap?.startNow?.length ? (
        <PdfChecklist items={roadmap.startNow} />
      ) : (
        <Text style={s.missingNote}>Specific starter activities aren&apos;t yet available in the career database.</Text>
      )}

      {rc.skillPlan.length > 0 && (
        <>
          <Text style={s.label}>Skill Development Plan</Text>
          <Text style={[s.body, { fontSize: 8, color: pdfColors.inkFaint, marginBottom: 4 }]}>
            Typical skill requirements for this career — not a claim about {data.base.who}&apos;s current level.
          </Text>
          <View style={s.skillTable}>
            <View style={s.skillHeadRow}>
              <Text style={[s.skillHeadText, s.skillColName]}>Skill</Text>
              <Text style={[s.skillHeadText, s.skillColRel]}>Career Relevance</Text>
              <Text style={[s.skillHeadText, s.skillColHow]}>How to Develop It</Text>
            </View>
            {rc.skillPlan.map((row) => (
              <View key={row.skill} style={s.skillRow}>
                <Text style={[s.skillCellName, s.skillColName]}>{row.skill}</Text>
                <Text style={[s.skillCellText, s.skillColRel]}>{row.relevance}</Text>
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
      <Text style={s.h1}>Your Next Steps</Text>

      <Text style={s.label}>Key Assessment Insights</Text>
      {data.profileStrengths.slice(0, 3).map((item) => (
        <View key={item} style={s.bullet}>
          <Text style={s.bulletMark}>—</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}

      <Text style={s.label}>Career Areas to Explore</Text>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>{careerTitles.join(", ")} — each with its own roadmap in Part II of this report.</Text>
      </View>

      <Text style={s.label}>Immediate Actions</Text>
      {immediateActions.map((item) => (
        <View key={item} style={s.bullet}>
          <Text style={s.bulletMark}>—</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}

      <Text style={s.label}>Roadmap Milestones</Text>
      <View style={s.bullet}>
        <Text style={s.bulletMark}>—</Text>
        <Text style={s.bulletText}>{milestoneLabels.join(" → ")}</Text>
      </View>

      <View style={s.disclaimerBox}>
        <Text style={s.disclaimerTitle}>A Note on This Report</Text>
        <Text style={s.disclaimerText}>{DISCLAIMER}</Text>
      </View>

      <Footer data={data} />
    </Page>
  );
}
