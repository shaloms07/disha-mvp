/**
 * Data shaping for Part II — Career Roadmap — of the Deep-Dive + Roadmap
 * Report. Builds on the same BaseReportData/CareerRow used by Part I (see
 * lib/pdf/reportData.ts), adding only what the roadmap pages need: which
 * careers get a full roadmap, the education pathway, the grade-aware stage
 * timeline, and the skill-development table. Nothing here recomputes or
 * overrides the interest-alignment scoring in lib/matching.ts — "why it
 * appears" is the same explainCareerMatch() Part I uses.
 */

import type { RiasecType } from "@/types";
import { rankTypes } from "@/lib/scoring";
import type { TimelineStage } from "./primitives";
import type { BaseReportData, CareerRow } from "./reportData";
import { type CareerExplanation, explainCareerMatch } from "./reportInterpretation";

export interface EducationPathwayNode {
  label: string;
  text: string;
}

export interface SkillPlanRow {
  skill: string;
  relevance: "High" | "Medium";
  howToDevelop: string;
}

export interface RoadmapCareer {
  career: CareerRow;
  explanation: CareerExplanation;
  hasRoadmapDetail: boolean;
  pathway: EducationPathwayNode[];
  stages: TimelineStage[];
  skillPlan: SkillPlanRow[];
}

export interface RoadmapReportData {
  studentGrade: string;
  gradeKnown: boolean;
  careers: RoadmapCareer[];
}

export interface BuildRoadmapReportDataInput {
  base: BaseReportData;
  studentScores: Record<RiasecType, number>;
  childClass?: string;
  /** Which careers get a full roadmap. Defaults to the top N by match rank when omitted. */
  selectedCareerIds?: string[];
  /** Only used when selectedCareerIds is omitted. */
  roadmapCareerCount?: number;
}

function parseGrade(childClass: string | undefined): number | undefined {
  if (!childClass) return undefined;
  const match = childClass.match(/\d+/);
  if (!match) return undefined;
  const grade = Number(match[0]);
  return grade >= 8 && grade <= 12 ? grade : undefined;
}

/** Which of the 6 stages the student's own grade puts them at right now — undefined when the grade isn't known. */
function nowStageIndex(grade: number | undefined): number | undefined {
  if (grade === undefined) return undefined;
  if (grade <= 9) return 0; // School Foundation
  if (grade === 10) return 1; // Subject / Stream Decision
  return 2; // 11-12 -> Entrance / Education prep
}

const HOW_TO_DEVELOP_FALLBACKS: [RegExp, string][] = [
  [/storytelling|video editing|platform awareness/i, "Create and publish consistently — this skill develops through real output and audience feedback, not study alone."],
  [/programm|coding|version control|python|ml\b/i, "Build small real projects — the fastest way this skill actually develops."],
  [/communicat|present|persuasive|pitch|relationship-building|market awareness/i, "Practice through presentations, debate, or explaining ideas to someone unfamiliar with them."],
  [/design software|typograph|visual composition|design sensibility/i, "Build a small portfolio and get feedback from someone working in the field."],
  [/leadership|negotiat|risk tolerance|resourcefulness/i, "Take on a small real leadership role — a club, a project, an event — rather than reading about it."],
  [/numerical|statistic|data visualization|analytical|logical|reasoning|general awareness/i, "Regular, varied practice problems — puzzles, case-style questions, real datasets or current-affairs analysis."],
  [/listen|empath|interpersonal|conflict|patience/i, "Practice through real conversations and group work, not just theory."],
  [/attention to detail|precision|accuracy|ethic|integrity|judgement|regulatory|confidentiality/i, "Build through careful, checked practice — proofreading, review, or structured checklists."],
  [/cad|technical drawing|spatial|applied physics|hands-on troubleshooting/i, "Hands-on practice with a beginner design or drawing tool, building toward small real projects."],
  [/composure|pressure|resilience|decision-making/i, "Build through low-stakes exposure to time pressure — mock scenarios, timed practice, or real deadlines that aren't high-stakes yet."],
  [/memory retention|subject mastery/i, "Build through active recall and teaching the material to someone else, rather than passive review."],
  [/organization|consistency|classroom management/i, "Build through a real, recurring responsibility that requires follow-through."],
];

function howToDevelopFor(skill: string): string {
  for (const [pattern, advice] of HOW_TO_DEVELOP_FALLBACKS) {
    if (pattern.test(skill)) return advice;
  }
  return "Build through deliberate practice, small real projects, and feedback from someone experienced in the field.";
}

function buildSkillPlan(skillsToDevelop: string[] | undefined): SkillPlanRow[] {
  if (!skillsToDevelop || skillsToDevelop.length === 0) return [];
  return skillsToDevelop.slice(0, 5).map((skill, i) => ({
    skill,
    relevance: i < 2 ? "High" : "Medium",
    howToDevelop: howToDevelopFor(skill),
  }));
}

function buildPathway(career: CareerRow): EducationPathwayNode[] {
  const roadmap = career.roadmap;
  return [
    { label: "Grade 8-10", text: "Build foundational interest and skills" },
    { label: "Grade 11-12", text: roadmap?.eligibility ?? "Choose a relevant stream" },
    { label: "Entrance", text: roadmap?.exams?.[0] ?? "Career-specific entrance step" },
    { label: "Undergraduate", text: roadmap?.collegesOrPaths?.[0] ?? "Relevant degree or diploma" },
    { label: "Early Career", text: roadmap?.stage6 ?? "Entry-level role, then specialization" },
  ];
}

function buildStages(career: CareerRow, grade: number | undefined): TimelineStage[] {
  const roadmap = career.roadmap;
  const nowIndex = nowStageIndex(grade);
  const statusFor = (i: number): TimelineStage["status"] => {
    if (nowIndex === undefined) return undefined;
    if (i < nowIndex) return "done";
    if (i === nowIndex) return "now";
    return "upcoming";
  };

  const examsText = roadmap?.exams?.length
    ? `Prepare for ${roadmap.exams.slice(0, 3).join(", ")}.`
    : "No formal entrance exam is typically required for this path.";
  const collegesText = roadmap?.collegesOrPaths?.length
    ? `Pursue ${roadmap.collegesOrPaths[0]}${roadmap.collegesOrPaths[1] ? `, or ${roadmap.collegesOrPaths[1]}` : ""}.`
    : "Education route not yet available in the career database.";

  const stages: { label: string; title: string; detail: string }[] = [
    { label: "Stage 1", title: "School Foundation", detail: roadmap?.stage1 ?? "Career-specific foundation not yet available in the career database." },
    { label: "Stage 2", title: "Subject / Stream Decision", detail: roadmap?.stage2 ?? "Career-specific stream guidance not yet available in the career database." },
    { label: "Stage 3", title: "Entrance / Education", detail: examsText },
    { label: "Stage 4", title: "College / Training", detail: collegesText },
    { label: "Stage 5", title: "Skills & Projects", detail: roadmap?.stage5 ?? "Career-specific project guidance not yet available in the career database." },
    { label: "Stage 6", title: "Early Career", detail: roadmap?.stage6 ?? "Career-specific early-career guidance not yet available in the career database." },
  ];

  return stages.map((stage, i) => ({ ...stage, status: statusFor(i) }));
}

/**
 * Report generation entry points (see AGENTS notes in lib/pdf/DeepDiveDocument.tsx
 * and lib/pdf/DeepDiveRoadmapDocument.tsx): this function is the
 * `generateRoadmapReport`-equivalent half of `generateDeepDiveAndRoadmapReport` —
 * it never runs standalone, always alongside buildDeepDiveReportData's Part I data.
 */
export function buildRoadmapReportData(input: BuildRoadmapReportDataInput): RoadmapReportData {
  const { base, studentScores, childClass, selectedCareerIds, roadmapCareerCount = 3 } = input;
  const studentRanked = rankTypes(studentScores);
  const grade = parseGrade(childClass);

  const selected = selectedCareerIds?.length
    ? base.careers.filter((c) => selectedCareerIds.includes(c.id))
    : base.careers.slice(0, roadmapCareerCount);

  const careers: RoadmapCareer[] = selected.map((career) => ({
    career,
    explanation: explainCareerMatch(career, studentRanked),
    hasRoadmapDetail: Boolean(career.roadmap),
    pathway: buildPathway(career),
    stages: buildStages(career, grade),
    skillPlan: buildSkillPlan(career.roadmap?.skillsToDevelop),
  }));

  return {
    studentGrade: childClass ?? "",
    gradeKnown: grade !== undefined,
    careers,
  };
}
