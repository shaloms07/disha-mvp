/**
 * Deterministic interpretation copy and rule engines for the Deep-Dive
 * Assessment Report. Everything here composes real scores from
 * lib/pdf/reportData.ts into prose — no methodology is invented, no score is
 * fabricated, and career "alignment" is only ever described in dimensions
 * the existing matching engine (lib/matching.ts, interest-profile shape
 * similarity only) actually computes. Aptitude/behavioral/work-value context
 * shown alongside a career match is presented as the student's own profile,
 * never as a per-career score the algorithm doesn't produce.
 */

import type { RiasecType, SjtTrait } from "@/types";
import { RIASEC_LABELS } from "@/types";
import { rankTypes } from "@/lib/scoring";
import type { AlignmentBand } from "./primitives";
import type { AptitudeRow, BaseReportData, BehavioralRow, CareerRow, InterestRow, WorkValueRow } from "./reportData";

/* ============================================================ RIASEC ==== */

interface RiasecCopy {
  enjoys: string;
  problemTypes: string;
  environments: string;
  lessEngaging: string;
  practiceExamples: string[];
}

export const RIASEC_INTERPRETATION: Record<RiasecType, RiasecCopy> = {
  R: {
    enjoys: "working with tools, machines and physical materials — hands-on building, fixing and testing",
    problemTypes: "concrete, practical problems with a tangible outcome — something that can be built, repaired or demonstrated",
    environments: "workshops, labs, outdoor or field settings, and roles with a real physical or technical component",
    lessEngaging: "environments built almost entirely around abstract theory or extended discussion, with little hands-on work",
    practiceExamples: [
      "Choosing a project that involves building or testing a physical model rather than writing about one",
      "Gravitating toward subjects with a lab, workshop or field component",
      "Preferring to fix or assemble something rather than read the manual for it",
      "Enjoying sport, crafts or outdoor activity over long seated discussion",
    ],
  },
  I: {
    enjoys: "analysing information, asking why something works, and reasoning through open-ended problems",
    problemTypes: "problems that reward careful reasoning — data, patterns, causes and effects",
    environments: "research or analysis-driven settings that reward independent, in-depth thinking",
    lessEngaging: "highly routine, repetitive tasks with little room to investigate or question",
    practiceExamples: [
      "Digging into how or why something works instead of stopping at the surface explanation",
      "Being drawn to subjects like science, mathematics, or logic-based problems",
      "Preferring to research a topic in depth before forming an opinion on it",
      "Enjoying evidence and data-backed arguments over ones based on opinion",
    ],
  },
  A: {
    enjoys: "original expression — writing, design, music or performance — and work without one fixed template",
    problemTypes: "open-ended problems with more than one right answer, where originality is rewarded",
    environments: "creative, flexible settings that leave room for a personal style or interpretation",
    lessEngaging: "rigid, rule-bound settings with a single correct procedure and little room to interpret the brief",
    practiceExamples: [
      "Choosing to present a project in an original format rather than the standard one",
      "Being drawn to subjects like art, music, literature or design",
      "Preferring an assignment with room for a personal angle over a fixed rubric",
      "Getting more energy from making something than from following a set process",
    ],
  },
  S: {
    enjoys: "working directly with people — teaching, helping, listening — and contributing to their progress",
    problemTypes: "problems centred on people — understanding, supporting or coordinating a group",
    environments: "collaborative, people-facing settings such as teaching, counselling or community work",
    lessEngaging: "isolated, solitary work with minimal interaction with others over long stretches",
    practiceExamples: [
      "Naturally taking on a peer-support or coordination role in a group project",
      "Being drawn to activities centred on people — teaching, community work, mentoring",
      "Feeling more energised after a group discussion than after quiet solo work",
      "Noticing and responding when a friend or classmate needs help",
    ],
  },
  E: {
    enjoys: "leading, persuading and organising people around an idea, and taking initiative",
    problemTypes: "problems that reward decisiveness and influence — pitching an idea, rallying a group, closing on a plan",
    environments: "leadership, sales or venture-oriented settings with visible ownership of an outcome",
    lessEngaging: "highly structured settings with little room to take initiative or influence a decision",
    practiceExamples: [
      "Taking the lead in organising a group project or event without being asked to",
      "Enjoying debate, pitching ideas, or persuading others toward a plan",
      "Being drawn to competitions, leadership roles, or student initiatives",
      "Preferring to propose a new approach rather than follow an existing one",
    ],
  },
  C: {
    enjoys: "structure, accuracy and order — organising information and getting details right",
    problemTypes: "problems with a clear process and a correct, verifiable answer",
    environments: "organised settings with clear systems, procedures and reliable expectations",
    lessEngaging: "loosely structured settings with ambiguous goals and no clear process to follow",
    practiceExamples: [
      "Keeping organised notes, schedules or records without being asked to",
      "Preferring subjects with a clear right answer and a defined method",
      "Feeling more comfortable with a checklist or rubric than an open brief",
      "Noticing errors or inconsistencies that others tend to miss",
    ],
  },
};

export function buildInterestInterpretation(rows: InterestRow[], who: string) {
  const [first, second, third] = rows;
  const strongest = [first, second];
  return {
    first,
    second,
    third,
    headline: `${who}'s strongest interests are ${first.label} and ${second.label}`,
    enjoys: strongest.map((r) => RIASEC_INTERPRETATION[r.type].enjoys).join("; also "),
    problemTypes: RIASEC_INTERPRETATION[first.type].problemTypes,
    environments: `${RIASEC_INTERPRETATION[first.type].environments}, along with ${RIASEC_INTERPRETATION[second.type].environments}`,
    lessEngaging: RIASEC_INTERPRETATION[rows[rows.length - 1].type].lessEngaging,
    practiceExamples: [
      ...RIASEC_INTERPRETATION[first.type].practiceExamples.slice(0, 3),
      ...RIASEC_INTERPRETATION[second.type].practiceExamples.slice(0, 2),
    ],
  };
}

/* ==================================================== cognitive aptitude */

export function buildAptitudeNarrative(rows: AptitudeRow[], who: string) {
  const sorted = [...rows].sort((a, b) => b.percent - a.percent);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const spread = top.percent - bottom.percent;
  const balanced = spread < 15;

  const pattern = balanced
    ? `${who}'s results are fairly balanced across numerical, verbal and spatial reasoning, with no single domain standing far apart from the others (within ${spread} percentage points of one another).`
    : `${who}'s ${top.label.toLowerCase()} reasoning (${top.percent}%) came through relatively stronger than ${bottom.label.toLowerCase()} reasoning (${bottom.percent}%) on this assessment.`;

  const strengths = balanced
    ? [`A well-rounded reasoning profile — no domain is notably behind the others, which is a genuine strength in itself.`]
    : sorted
        .filter((r) => r.percent >= 65 && r.percent - bottom.percent >= 10)
        .map((r) => `${r.label} reasoning (${r.percent}%) is the relative high point of this assessment.`);

  const developAreas = balanced
    ? [`No domain stands out as a priority — general practice across numerical, verbal and spatial reasoning will keep all three moving together.`]
    : [`${bottom.label} reasoning (${bottom.percent}%) is the relative low point here — worth building through regular practice rather than treating as a fixed limit.`];

  return { pattern, strengths: strengths.length ? strengths : [pattern], developAreas, balanced, top, bottom };
}

/* =============================================== behavioral / OCEAN ==== */

interface TraitLevelCopy {
  adjective: string;
  narrative: string;
}

const BEHAVIOR_COPY: Record<SjtTrait, { high: TraitLevelCopy; low: TraitLevelCopy; mid: string }> = {
  openness: {
    high: {
      adjective: "exploratory",
      narrative:
        "Your responses indicate an openness to new ideas and unfamiliar approaches. Within this assessment, this shows up as comfort with flexible, less-structured tasks and a willingness to explore more than one approach before settling on one — useful in independent project work as well as open-ended team discussion.",
    },
    low: {
      adjective: "practical",
      narrative:
        "Your responses indicate a preference for familiar, proven approaches over untested ones. Within this assessment, this shows up as comfort with clearly defined tasks and a preference for practical, established methods — useful in structured environments with a clear brief, and worth pairing with deliberate exposure to new approaches over time.",
    },
    mid: "Your responses fall in a balanced range on this trait — neither strongly favouring novelty nor familiarity, and adapting to either depending on the task.",
  },
  conscientiousness: {
    high: {
      adjective: "structured and dependable",
      narrative:
        "Your responses suggest a preference for planning, order and follow-through. Within this assessment, this shows up as comfort in structured environments with clear expectations, reliability in team settings, and a methodical approach to problem-solving.",
    },
    low: {
      adjective: "flexible",
      narrative:
        "Your responses suggest more comfort with flexibility than with rigid structure. This can show up as adaptability when plans change, and less enthusiasm for tightly defined routines — a profile that may benefit from external structure such as checklists and deadlines in more demanding settings.",
    },
    mid: "Your responses fall in a balanced range on this trait — comfortable with structure when it's useful, without needing it at all times.",
  },
  extraversion: {
    high: {
      adjective: "socially engaged",
      narrative:
        "Your responses suggest energy drawn from interaction with others. This shows up as comfort in team environments and group problem-solving, and a preference for talking through ideas rather than working through them alone.",
    },
    low: {
      adjective: "independent",
      narrative:
        "Your responses suggest more energy from independent work than from group interaction. This shows up as comfort with focused, independent study, and a preference for processing ideas before discussing them in a group.",
    },
    mid: "Your responses fall in a balanced range on this trait — comfortable in both group and independent settings, depending on the task.",
  },
  agreeableness: {
    high: {
      adjective: "collaborative",
      narrative:
        "Your responses suggest a cooperative, consensus-seeking style. This shows up as ease in team environments, comfort supporting others' ideas, and a collaborative approach to problem-solving.",
    },
    low: {
      adjective: "direct",
      narrative:
        "Your responses suggest a more direct, independent style in group settings. This can show up as comfort voicing disagreement and a preference for clear, efficient interactions over extended group consensus-building.",
    },
    mid: "Your responses fall in a balanced range on this trait — able to cooperate closely or work independently as the situation calls for it.",
  },
  neuroticism: {
    high: {
      adjective: "careful and risk-aware",
      narrative:
        "Your responses indicate a heightened sensitivity to pressure or uncertainty within this assessment's scenarios. This can show up as careful, risk-aware decision-making, and a preference for predictable, well-structured situations over high-pressure or ambiguous ones.",
    },
    low: {
      adjective: "steady",
      narrative:
        "Your responses indicate steadiness under pressure within this assessment's scenarios. This shows up as calm decision-making in unpredictable or high-pressure situations, and general comfort with ambiguity.",
    },
    mid: "Your responses fall in a balanced range on this trait — generally steady, with occasional sensitivity to genuinely high-pressure situations.",
  },
};

export function behaviorLevel(percent: number): "high" | "mid" | "low" {
  if (percent >= 60) return "high";
  if (percent <= 40) return "low";
  return "mid";
}

export function behaviorAdjective(trait: SjtTrait, percent: number): string {
  const level = behaviorLevel(percent);
  if (level === "mid") return "balanced";
  return BEHAVIOR_COPY[trait][level].adjective;
}

export function behaviorNarrative(trait: SjtTrait, percent: number): string {
  const level = behaviorLevel(percent);
  if (level === "mid") return BEHAVIOR_COPY[trait].mid;
  return BEHAVIOR_COPY[trait][level].narrative;
}

/* ==================================================== work values ==== */

export function buildWorkValuesInterpretation(rows: WorkValueRow[], who: string) {
  const top = rows.slice(0, 4);
  const [first, second] = rows;
  return {
    top,
    headline: `${who}'s top motivators are ${first.label} and ${second.label}`,
    whatMayMatter: `Roles and environments that offer ${first.label.toLowerCase()} and ${second.label.toLowerCase()} are likely to feel the most sustaining over time. Settings that consistently work against these — for example, ones offering little ${first.label.toLowerCase()} — may feel less satisfying even when the work itself is otherwise a good fit.`,
  };
}

/* =========================================== integrated career profile */

export function buildIntegratedNarrative(data: BaseReportData): string {
  const { interestRows, aptitudeRows, behavioralRows, workValueRows, who } = data;
  const [i1, i2] = interestRows;
  const topAptitude = [...aptitudeRows].sort((a, b) => b.percent - a.percent)[0];
  const topTrait = behavioralRows[0];
  const [v1, v2] = workValueRows;

  const aptitudePhrase = `a relative strength in ${topAptitude.label.toLowerCase()} reasoning`;
  const behaviorPhrase = `a ${behaviorAdjective(topTrait.trait, topTrait.percent)} working style`;
  const valuesPhrase = `a preference for ${v1.label.toLowerCase()} and ${v2.label.toLowerCase()} in a future role`;

  return (
    `${who}'s profile combines a pull toward ${i1.label} and ${i2.label} interests with ${aptitudePhrase}, ` +
    `alongside ${behaviorPhrase} and ${valuesPhrase}. Together, this points toward career areas worth exploring ` +
    `at the intersection of these patterns — ${i1.label.toLowerCase()}-oriented work that also draws on ` +
    `${topAptitude.label.toLowerCase()} reasoning and rewards ${v1.label.toLowerCase()}.`
  );
}

export function buildExecutiveSummary(data: BaseReportData): string {
  const { interestRows, aptitudeRows, behavioralRows, workValueRows, who } = data;
  const [i1, i2] = interestRows;
  const topAptitude = [...aptitudeRows].sort((a, b) => b.percent - a.percent)[0];
  const topTrait = behavioralRows[0];
  const v1 = workValueRows[0];

  return (
    `${who}'s assessment shows a clear pull toward ${i1.label} and ${i2.label} interests, the two patterns that ` +
    `most consistently stood out across the interest inventory. On the cognitive side, ${topAptitude.label.toLowerCase()} ` +
    `reasoning came through as a relative strength. Behaviorally, the responses lean ${behaviorAdjective(topTrait.trait, topTrait.percent)}, ` +
    `and ${v1.label.toLowerCase()} stands out as the leading priority in what ${who.toLowerCase() === "you" ? "you" : who} would want from a future role. ` +
    `Read together, these four patterns — not any single score — are what the rest of this report uses to explore career areas worth considering.`
  );
}

export interface ProfileGlance {
  label: string;
  value: string;
}

export function buildProfileAtAGlance(data: BaseReportData): ProfileGlance[] {
  const { interestRows, aptitudeRows, behavioralRows, workValueRows, hollandCode } = data;
  const [i1, i2] = interestRows;
  const aptSorted = [...aptitudeRows].sort((a, b) => b.percent - a.percent);
  const aptSpread = aptSorted[0].percent - aptSorted[aptSorted.length - 1].percent;
  const topTrait = behavioralRows[0];
  const [v1, v2] = workValueRows;

  return [
    { label: "Interest pattern", value: `${i1.label} + ${i2.label}  ·  Holland code ${hollandCode}` },
    {
      label: "Cognitive pattern",
      value: aptSpread < 15 ? "Balanced across numerical, verbal and spatial reasoning" : `Strongest in ${aptSorted[0].label} reasoning`,
    },
    { label: "Behavioral pattern", value: `${behaviorAdjective(topTrait.trait, topTrait.percent)} response pattern (${topTrait.label})` },
    { label: "Motivators", value: `${v1.label} and ${v2.label} lead your priorities` },
  ];
}

/* ================================================= profile strengths === */

export function buildProfileStrengths(data: BaseReportData): string[] {
  const { interestRows, aptitudeRows, behavioralRows, workValueRows } = data;
  const strengths: string[] = [];
  const [i1, i2] = interestRows;
  const spread = i1.percent - interestRows[interestRows.length - 1].percent;

  if (spread >= 25) {
    strengths.push(`A clearly defined interest pattern (${i1.label} + ${i2.label}), which gives career exploration a genuine starting direction rather than a blank slate.`);
  }

  const strongAptitudes = [...aptitudeRows].filter((r) => r.percent >= 65).sort((a, b) => b.percent - a.percent);
  if (strongAptitudes.length) {
    strengths.push(`${strongAptitudes[0].label} reasoning (${strongAptitudes[0].percent}%) is a genuine, assessment-backed strength worth building on.`);
  }

  for (const row of behavioralRows.slice(0, 2)) {
    const level = behaviorLevel(row.percent);
    if (level === "high") {
      strengths.push(`A ${behaviorAdjective(row.trait, row.percent)} response pattern (${row.label}), which tends to support ${behaviorStrengthContext(row.trait)}.`);
    }
  }

  const topValue = workValueRows[0];
  if (topValue.percent >= 80) {
    strengths.push(`A clear, strongly-held priority around ${topValue.label.toLowerCase()} — useful for filtering opportunities that will and won't feel worthwhile.`);
  }

  if (strengths.length < 3) {
    strengths.push(`A completed four-pillar profile in itself — interest, aptitude, behavior and values all now have real data behind them rather than guesswork.`);
  }

  return strengths.slice(0, 5);
}

function behaviorStrengthContext(trait: SjtTrait): string {
  const map: Record<SjtTrait, string> = {
    openness: "exploring unfamiliar problems and adapting to new approaches",
    conscientiousness: "following through on plans and delivering reliably",
    extraversion: "group work, discussion and collaborative problem-solving",
    agreeableness: "smooth teamwork and cooperative group settings",
    neuroticism: "careful, risk-aware decision-making under pressure",
  };
  return map[trait];
}

/* =============================================== development signals === */

export interface DevelopmentSignal {
  category: string;
  headline: string;
  shortNote: string;
  longNote: string;
}

export function deriveDevelopmentSignals(data: BaseReportData): DevelopmentSignal[] {
  const { aptitudeRows, behavioralRows, workValueRows, interestRows } = data;
  const signals: DevelopmentSignal[] = [];

  const aptSorted = [...aptitudeRows].sort((a, b) => b.percent - a.percent);
  const aptTop = aptSorted[0];
  const aptBottom = aptSorted[aptSorted.length - 1];

  if (aptTop.percent - aptBottom.percent >= 15) {
    signals.push({
      category: "Reasoning",
      headline: `${aptBottom.label} reasoning`,
      shortNote: `${aptBottom.label} reasoning (${aptBottom.percent}%) trailed the other two domains — a good candidate for regular, low-stakes practice.`,
      longNote: `${aptBottom.label} reasoning came in relatively lower than ${aptTop.label.toLowerCase()} reasoning on this assessment (${aptBottom.percent}% vs. ${aptTop.percent}%). This is a pattern, not a fixed ceiling — short, regular practice with ${aptBottom.label.toLowerCase()} problems (puzzles, structured exercises, or subject practice that leans on this domain) is a reasonable way to build it up over time.`,
    });
  }

  const traitByKey = Object.fromEntries(behavioralRows.map((r) => [r.trait, r])) as Record<SjtTrait, BehavioralRow>;

  if (traitByKey.extraversion.percent <= 40) {
    signals.push({
      category: "Communication",
      headline: "Verbal / group communication",
      shortNote: "Responses lean toward independent processing over group discussion — worth practicing verbal communication in lower-stakes group settings.",
      longNote: "This assessment's behavioral responses lean toward independent, reflective processing rather than group discussion. That's a legitimate working style, not a deficit — but building comfort with speaking up in group settings (a class discussion, a small team project) can widen the range of environments that feel workable, without changing the underlying preference for independent work.",
    });
  }

  if (traitByKey.agreeableness.percent <= 40 || traitByKey.extraversion.percent <= 40) {
    signals.push({
      category: "Collaboration",
      headline: "Team collaboration",
      shortNote: "A more independent, direct working style — deliberate practice with group projects can help this translate smoothly into team settings.",
      longNote: "The behavioral responses suggest more comfort working independently or directly than through extended group consensus-building. Many careers still require some degree of team collaboration, so deliberately seeking out group project experience — even in a small, low-stakes way — can help this style translate smoothly when collaboration is required.",
    });
  }

  if (traitByKey.openness.percent <= 40 && interestRows.find((r) => r.type === "A")!.percent <= 40) {
    signals.push({
      category: "Creativity",
      headline: "Open-ended / creative problem-solving",
      shortNote: "Both the interest and behavioral data lean toward familiar, structured approaches — light creative practice can build comfort with more open-ended tasks.",
      longNote: "Both the Artistic interest score and the Openness behavioral trait came in on the lower side, suggesting a preference for familiar, well-defined approaches over open-ended ones. This isn't a weakness in itself, but low-stakes practice with open-ended tasks — a project with more than one right answer, a brief with room to interpret — can build comfort with ambiguity where it's genuinely useful.",
    });
  }

  const realisticOrInvestigative = interestRows.find((r) => r.type === "R" || r.type === "I")!;
  if (realisticOrInvestigative.percent >= 70 && (aptSorted.find((r) => r.domain === "numerical")?.percent ?? 100) < 55) {
    signals.push({
      category: "Technical exploration",
      headline: "Hands-on technical practice",
      shortNote: "Interest in hands-on or analytical work is ahead of current numerical reasoning scores — targeted technical practice can help close that gap.",
      longNote: "Interest in hands-on or analytical fields came through clearly, but numerical reasoning scored relatively lower on this assessment. That's a common and closeable gap — targeted, practical exposure (a project, a short course, structured practice problems) tends to build this kind of reasoning faster than interest alone will.",
    });
  }

  if (traitByKey.conscientiousness.percent <= 40) {
    signals.push({
      category: "Structured working",
      headline: "Planning & follow-through",
      shortNote: "Responses lean flexible over structured — external tools like checklists and deadlines can help translate ideas into finished work.",
      longNote: "The behavioral responses lean toward flexibility over rigid structure, which brings real adaptability but can make sustained, multi-step projects harder to see through without support. External structure — checklists, defined milestones, an accountability partner — tends to help this working style finish what it starts, without requiring a personality change.",
    });
  }

  const autonomy = workValueRows.find((r) => r.key === "Autonomy");
  if (autonomy && autonomy.percent >= 70 && traitByKey.conscientiousness.percent <= 50) {
    signals.push({
      category: "Independent learning",
      headline: "Self-directed study habits",
      shortNote: "A strong pull toward independence, paired with a flexible working style — building simple self-directed study habits will help this pay off.",
      longNote: "Autonomy scored as a leading work value, and the behavioral profile leans flexible rather than tightly structured. Independence is a real asset, but it works best paired with a few self-imposed habits (a simple routine, self-set checkpoints) so that independent study or independent work stays productive rather than open-ended.",
    });
  }

  if (signals.length < 2) {
    signals.push({
      category: "Problem solving",
      headline: "Broad problem-solving practice",
      shortNote: `General practice across reasoning types will keep all three domains — numerical, verbal and spatial — moving together.`,
      longNote: `No single area stood out as needing focused attention on this assessment — a genuinely balanced result. General, varied problem-solving practice (puzzles, case-style questions, real-world projects) is a reasonable way to keep developing all three reasoning domains together rather than specialising early.`,
    });
  }

  return signals.slice(0, 6);
}

/* ==================================================== career matching === */

export function alignmentBandFor(matchPercent: number): AlignmentBand {
  if (matchPercent >= 85) return "Very Strong Alignment";
  if (matchPercent >= 70) return "Strong Alignment";
  if (matchPercent >= 55) return "Moderate Alignment";
  return "Developing Alignment";
}

const EXPLORE_BY_DOMINANT_TYPE: Record<RiasecType, string> = {
  R: "Look for a hands-on project, workshop, or DIY activity connected to this field.",
  I: "Explore through research, reading, or a small independent investigative project.",
  A: "Try a creative project or portfolio piece connected to this field.",
  S: "Look for a volunteering, mentoring, or shadowing opportunity in this space.",
  E: "Take the lead on a small organising or initiative-driven project related to this field.",
  C: "Explore through an organising, planning, or detail-oriented project.",
};

export interface CareerExplanation {
  career: CareerRow;
  band: AlignmentBand;
  whyItAppears: string;
  whatToExplore: string;
}

export function explainCareerMatch(career: CareerRow, studentRanked: RiasecType[]): CareerExplanation {
  const careerRanked = rankTypes(career.profile);
  const [studentFirst, studentSecond] = studentRanked;
  const [careerFirst, careerSecond] = careerRanked;
  const shared = careerRanked.slice(0, 2).filter((t) => studentRanked.slice(0, 2).includes(t));

  const whyItAppears = shared.length
    ? `This career's own interest profile is led by ${RIASEC_LABELS[careerFirst]}${careerSecond ? ` and ${RIASEC_LABELS[careerSecond]}` : ""} — closely matching your own strongest interests, ${RIASEC_LABELS[studentFirst]} and ${RIASEC_LABELS[studentSecond]}.`
    : `This career's profile leans ${RIASEC_LABELS[careerFirst]}, which overlaps with your broader interest pattern even though it isn't your single strongest type.`;

  return {
    career,
    band: alignmentBandFor(career.matchPercent),
    whyItAppears,
    whatToExplore: EXPLORE_BY_DOMINANT_TYPE[careerFirst],
  };
}

/* ==================================================== conclusion page === */

export function buildKeyTakeaways(data: BaseReportData, strengths: string[], topCareerTitle: string | undefined): string[] {
  const { interestRows, hollandCode } = data;
  const [i1, i2] = interestRows;
  const takeaways = [
    `Your interest code is ${hollandCode}, led by ${i1.label} and ${i2.label} — a real, assessment-backed starting point for exploration.`,
    ...strengths.slice(0, 2),
  ];
  if (topCareerTitle) {
    takeaways.push(`${topCareerTitle} is the career area with the closest interest-profile alignment to your results — a reasonable place to start researching.`);
  }
  takeaways.push("This profile is a snapshot, not a verdict — interests, reasoning and values all keep developing through the school years.");
  return takeaways.slice(0, 5);
}

export function buildNextSteps(): string[] {
  return [
    "Discuss this report with a parent, teacher or mentor — a second perspective often surfaces options worth considering that a single read-through misses.",
    "Pick one or two of the career areas from the Career Matching section and spend some time researching what day-to-day work in that field actually looks like.",
    "Try one of the practical examples from the Understanding Your Interest Profile section to see whether the pattern holds up outside the assessment.",
    "Revisit this assessment in a year or two — interests, reasoning and values all continue to develop through the school years.",
  ];
}

export function buildSupportingContext(data: BaseReportData): string {
  const topAptitude = [...data.aptitudeRows].sort((a, b) => b.percent - a.percent)[0];
  const topTrait = data.behavioralRows[0];
  const topValue = data.workValueRows[0];
  return (
    `Career order below reflects interest-profile alignment — the dimension this assessment's matching engine ` +
    `actually scores. Independently, ${data.who.toLowerCase() === "you" ? "your" : `${data.who}'s`} assessment also shows a relative ` +
    `strength in ${topAptitude.label.toLowerCase()} reasoning, a ${behaviorAdjective(topTrait.trait, topTrait.percent)} behavioral ` +
    `pattern, and a leading preference for ${topValue.label.toLowerCase()} — real signals worth weighing alongside each match below, ` +
    `even though they are not part of the numeric ranking itself.`
  );
}
