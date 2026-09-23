/**
 * Shared @react-pdf/renderer building blocks for the Deep-Dive Assessment
 * Report. A report a family keeps: tinted panels rather than a bare white
 * page, a deep-teal brand spine, one reserved gold for "look here first", and
 * real charts drawn in SVG rather than glyphs borrowed from a text font.
 *
 * Two rules everything here follows:
 *   - Colour encodes something or it is chrome, never both. See lib/pdf/theme.ts.
 *   - Arrows, rings and rules are drawn as <Svg>. Helvetica carries no arrow
 *     glyph, so a text arrow previously printed as stray punctuation.
 */

import {
  Circle,
  Line,
  Path,
  Polygon,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ComponentProps, ReactNode } from "react";
import { pdfColors } from "./theme";

type ViewStyle = ComponentProps<typeof View>["style"];

const s = StyleSheet.create({
  header: {
    position: "absolute",
    top: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.75,
    borderBottomColor: pdfColors.hairline,
    paddingBottom: 8,
  },
  headerBrandRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerMark: { width: 3, height: 9, borderRadius: 1.5, backgroundColor: pdfColors.accent },
  headerBrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accent, letterSpacing: 1.4 },
  headerSection: { fontSize: 8, color: pdfColors.inkFaint, letterSpacing: 0.6, textTransform: "uppercase" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.75,
    borderTopColor: pdfColors.hairline,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: pdfColors.inkFaint },
  footerPage: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted },

  eyebrow: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  divider: { height: 0.75, backgroundColor: pdfColors.hairline, marginVertical: 14 },

  /* --- page title ------------------------------------------------------ */
  titleRule: { width: 34, height: 3, borderRadius: 1.5, backgroundColor: pdfColors.accent, marginBottom: 8 },

  /* --- bars ------------------------------------------------------------ */
  barRow: { marginBottom: 9 },
  barHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 3 },
  barLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  barLabel: { fontSize: 9, color: pdfColors.ink },
  barLabelStrong: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink },
  barValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: pdfColors.panelStrong, position: "relative" },
  barFill: { height: 6, borderRadius: 3 },
  barTick: { position: "absolute", top: -2, width: 0.75, height: 10, backgroundColor: pdfColors.hairlineStrong },

  meterTrack: { height: 4, borderRadius: 2, backgroundColor: pdfColors.panelStrong },
  meterFill: { height: 4, borderRadius: 2 },

  /* --- pills, badges, chips -------------------------------------------- */
  bandPill: {
    fontSize: 7.25,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 9,
    color: pdfColors.inkInverse,
    alignSelf: "flex-start",
  },
  chip: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    borderWidth: 0.75,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginRight: 6,
    marginBottom: 6,
  },
  numberBadge: { alignItems: "center", justifyContent: "center" },
  numberBadgeText: { fontFamily: "Helvetica-Bold" },

  /* --- cards & callouts ------------------------------------------------ */
  card: { borderRadius: 6, padding: 12 },
  calloutRow: { flexDirection: "row", borderRadius: 5, overflow: "hidden" },
  calloutRule: { width: 3 },
  calloutBody: { flex: 1, paddingVertical: 11, paddingHorizontal: 14 },

  /* --- pillar flow ----------------------------------------------------- */
  flowRow: { flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 8 },
  flowBox: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: pdfColors.hairline,
    backgroundColor: pdfColors.panel,
    borderRadius: 5,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  flowCap: { height: 3, borderRadius: 1.5, marginBottom: 7, width: 22 },
  flowBoxText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, textAlign: "center", letterSpacing: 0.4 },
  flowArrowWrap: { alignItems: "center", marginVertical: 8 },
  flowOutBox: {
    backgroundColor: pdfColors.accentDeep,
    borderRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  flowOutText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: pdfColors.inkInverse, textAlign: "center", letterSpacing: 0.8 },
});

/* ============================================================= chrome === */

/** Running header — repeats on every page it is placed on except the cover. */
export function PdfHeader({ section, reportTitle }: { section: string; reportTitle: string }) {
  return (
    <View style={s.header} fixed>
      <View style={s.headerBrandRow}>
        <View style={s.headerMark} />
        <Text style={s.headerBrand}>{reportTitle}</Text>
      </View>
      <Text style={s.headerSection}>{section}</Text>
    </View>
  );
}

/** Running footer — page numbers plus report metadata, on every page it is placed on. */
export function PdfFooter({ assessmentId, generatedOn }: { assessmentId: string; generatedOn: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {assessmentId} · Generated {generatedOn}
      </Text>
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function PdfEyebrow({ children }: { children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function PdfDivider() {
  return <View style={s.divider} />;
}

/** The short accent rule that sits above a page heading. */
export function PdfTitleRule({ color = pdfColors.accent }: { color?: string }) {
  return <View style={[s.titleRule, { backgroundColor: color }]} />;
}

/* ============================================================= arrows === */

/**
 * A drawn arrow. Helvetica has no arrow glyph, so a text arrow renders as
 * stray punctuation in the PDF — these are real geometry instead.
 */
export function PdfArrow({
  direction = "right",
  length = 18,
  color = pdfColors.hairlineStrong,
  thickness = 1,
}: {
  direction?: "right" | "down";
  length?: number;
  color?: string;
  thickness?: number;
}) {
  const head = 4;
  const half = head * 0.85;
  if (direction === "down") {
    return (
      <Svg width={head * 2} height={length} viewBox={`0 0 ${head * 2} ${length}`}>
        <Line x1={head} y1={0} x2={head} y2={length - head} stroke={color} strokeWidth={thickness} />
        <Polygon points={`${head},${length} ${head - half},${length - head} ${head + half},${length - head}`} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={length} height={head * 2} viewBox={`0 0 ${length} ${head * 2}`}>
      <Line x1={0} y1={head} x2={length - head} y2={head} stroke={color} strokeWidth={thickness} />
      <Polygon points={`${length},${head} ${length - head},${head - half} ${length - head},${head + half}`} fill={color} />
    </Svg>
  );
}

/* =============================================================== bars === */

/**
 * A labelled horizontal bar against a 0-max scale.
 *
 * `reference` draws a thin tick at a fixed point on the track — used on the
 * behavioural page, where the midpoint of the possible range is the thing
 * worth reading each trait against.
 */
export function PdfBar({
  label,
  value,
  max,
  color = pdfColors.accent,
  valueLabel,
  strong = false,
  reference,
  swatch,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  valueLabel?: string;
  /** The leading item — heavier label, so the eye lands on it first */
  strong?: boolean;
  /** 0-100 position of a reference tick on the track */
  reference?: number;
  /** A small colour chip before the label, when the bar colour is carrying identity */
  swatch?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(2, (value / max) * 100)) : 2;
  return (
    <View style={s.barRow}>
      <View style={s.barHeadRow}>
        <View style={s.barLabelRow}>
          {swatch ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: swatch }} /> : null}
          <Text style={strong ? s.barLabelStrong : s.barLabel}>{label}</Text>
        </View>
        <Text style={s.barValue}>{valueLabel ?? `${value}/${max}`}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        {reference !== undefined ? <View style={[s.barTick, { left: `${reference}%` }]} /> : null}
      </View>
    </View>
  );
}

/** A bare track and fill with no labels — inline magnitude next to text. */
export function PdfMeterLine({ percent, color = pdfColors.accent }: { percent: number; color?: string }) {
  const pct = Math.min(100, Math.max(2, percent));
  return (
    <View style={s.meterTrack}>
      <View style={[s.meterFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ============================================================== rings === */

function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  const clamped = Math.min(0.9999, Math.max(0, fraction));
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * clamped;
  const x0 = cx + r * Math.cos(start);
  const y0 = cy + r * Math.sin(start);
  const x1 = cx + r * Math.cos(end);
  const y1 = cy + r * Math.sin(end);
  const largeArc = clamped > 0.5 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`;
}

/**
 * One score against its own ceiling, as a ring.
 *
 * A meter rather than a pie: these are separate ratios, not slices of one
 * whole, and the domains have different maximums — anything implying they add
 * up to something would be wrong. The ring is the quick read; the numbers
 * printed with it are the actual answer.
 */
export function PdfRing({
  value,
  max,
  label,
  caption,
  size = 82,
  color = pdfColors.accent,
  strokeWidth = 8,
}: {
  value: number;
  max: number;
  label: string;
  caption?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const cx = size / 2;
  const r = (size - strokeWidth) / 2;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View style={{ alignItems: "center", width: size + 18 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cx} r={r} fill="none" stroke={pdfColors.panelStrong} strokeWidth={strokeWidth} />
        {fraction > 0 ? (
          <Path
            d={arcPath(cx, cx, r, fraction)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ) : null}
        <Text
          x={cx}
          y={cx + 4.5}
          textAnchor="middle"
          style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}
          fill={pdfColors.ink}
        >
          {`${Math.round(fraction * 100)}%`}
        </Text>
      </Svg>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 6, textAlign: "center" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 7.5, color: pdfColors.inkFaint, marginTop: 2, textAlign: "center" }}>
        {caption ?? `${value}/${max}`}
      </Text>
    </View>
  );
}

/* ====================================================== bands & badges === */

export type AlignmentBand = "Very Strong Alignment" | "Strong Alignment" | "Moderate Alignment" | "Developing Alignment";

const BAND_COLOR: Record<AlignmentBand, string> = {
  "Very Strong Alignment": pdfColors.band.veryStrong,
  "Strong Alignment": pdfColors.band.strong,
  "Moderate Alignment": pdfColors.band.moderate,
  "Developing Alignment": pdfColors.band.developing,
};

export function bandColor(band: AlignmentBand): string {
  return BAND_COLOR[band];
}

export function PdfAlignmentBand({ band }: { band: AlignmentBand }) {
  return <Text style={[s.bandPill, { backgroundColor: BAND_COLOR[band] }]}>{band.toUpperCase()}</Text>;
}

/** A small filled disc carrying a rank number. */
export function PdfNumberBadge({
  label,
  background = pdfColors.accent,
  color = pdfColors.inkInverse,
  size = 18,
}: {
  label: string;
  background?: string;
  color?: string;
  size?: number;
}) {
  return (
    <View style={[s.numberBadge, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Text style={[s.numberBadgeText, { color, fontSize: size * 0.46 }]}>{label}</Text>
    </View>
  );
}

/* ========================================================= containers === */

export function PdfCard({
  children,
  tint = pdfColors.panel,
  border,
  style,
}: {
  children: ReactNode;
  tint?: string;
  border?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        s.card,
        { backgroundColor: tint },
        border ? { borderWidth: 0.75, borderColor: border } : {},
        style ?? {},
      ]}
    >
      {children}
    </View>
  );
}

/** A tinted block with a coloured rule down its left edge. */
export function PdfCallout({
  children,
  tone = "accent",
  style,
}: {
  children: ReactNode;
  tone?: "accent" | "gold" | "warn" | "neutral";
  style?: ViewStyle;
}) {
  const tones = {
    accent: { rule: pdfColors.accent, tint: pdfColors.panelAccent },
    gold: { rule: pdfColors.gold, tint: pdfColors.goldSoft },
    warn: { rule: pdfColors.warn, tint: pdfColors.warnSoft },
    neutral: { rule: pdfColors.hairlineStrong, tint: pdfColors.panel },
  } as const;
  const { rule, tint } = tones[tone];
  return (
    <View style={[s.calloutRow, { backgroundColor: tint }, style ?? {}]}>
      <View style={[s.calloutRule, { backgroundColor: rule }]} />
      <View style={s.calloutBody}>{children}</View>
    </View>
  );
}

/* ===================================================== pillar diagram === */

/** The four assessment inputs feeding one output, as a flow diagram. */
export function PdfPillarFlow({ inputs, output }: { inputs: string[]; output: string }) {
  const steps = [0, 4, 1, 2].map((i) => pdfColors.decor[i].base);
  return (
    <View>
      <View style={s.flowRow}>
        {inputs.map((label, i) => (
          <View key={label} style={s.flowBox}>
            <View style={[s.flowCap, { backgroundColor: steps[i % steps.length] }]} />
            <Text style={s.flowBoxText}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={s.flowArrowWrap}>
        <PdfArrow direction="down" length={20} color={pdfColors.accentMuted} thickness={1.25} />
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={s.flowOutBox}>
          <Text style={s.flowOutText}>{output}</Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================== radar === */

/**
 * The profile chart: one coloured radial bar per axis, plus the polygon that
 * joins their tips.
 *
 * The radial bar is what carries the value — length from the centre, linear,
 * so a score twice as high draws twice as far. A filled wedge or rose would
 * have encoded the same number as an area and exaggerated every difference by
 * squaring it. The joining polygon is shape only: it makes the profile
 * readable at a glance without being the thing you measure.
 *
 * Each axis wears its own colour so the spread across types is visible rather
 * than a single-hue blob, and every axis is labelled, so identity never rests
 * on colour alone.
 */
export function PdfRadar({
  axes,
  size = 210,
}: {
  axes: { key: string; label: string; value: number; max: number; color: string; labelColor?: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 30;
  const count = axes.length;

  const point = (radius: number, index: number): [number, number] => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const ring = (fraction: number) => axes.map((_, i) => point(maxRadius * fraction, i).join(",")).join(" ");
  const ratioOf = (axis: { value: number; max: number }) =>
    axis.max > 0 ? Math.min(1, Math.max(0, axis.value / axis.max)) : 0;

  /* A floor on the drawn length so a zero score still shows its colour. */
  const radiusOf = (axis: { value: number; max: number }) => Math.max(maxRadius * ratioOf(axis), 5);

  const dataPolygon = axes.map((axis, i) => point(radiusOf(axis), i).join(",")).join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={ring(1)} fill={pdfColors.panel} stroke="none" />
      <Polygon points={ring(0.25)} stroke={pdfColors.hairline} strokeWidth={0.6} fill="none" />
      <Polygon points={ring(0.5)} stroke={pdfColors.hairline} strokeWidth={0.6} fill="none" />
      <Polygon points={ring(0.75)} stroke={pdfColors.hairline} strokeWidth={0.6} fill="none" />
      <Polygon points={ring(1)} stroke={pdfColors.hairlineStrong} strokeWidth={0.75} fill="none" />

      {/* Shape, drawn under the bars so it never obscures a value. */}
      <Polygon points={dataPolygon} stroke={pdfColors.accentMuted} strokeWidth={1.1} fill={pdfColors.accent} fillOpacity={0.09} />

      {axes.map((axis, i) => {
        const [x, y] = point(radiusOf(axis), i);
        return (
          <Line
            key={`${axis.key}-bar`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={axis.color}
            strokeWidth={6.5}
            strokeLinecap="round"
          />
        );
      })}

      {axes.map((axis, i) => {
        const [x, y] = point(radiusOf(axis), i);
        return (
          <Circle key={`${axis.key}-dot`} cx={x} cy={y} r={3} fill={axis.color} stroke={pdfColors.page} strokeWidth={1.25} />
        );
      })}

      <Circle cx={cx} cy={cy} r={3} fill={pdfColors.page} stroke={pdfColors.hairlineStrong} strokeWidth={0.75} />

      {axes.map((axis, i) => {
        const [x, y] = point(maxRadius + 17, i);
        return (
          <Text
            key={axis.key}
            x={x}
            y={y + 3}
            textAnchor="middle"
            style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold" }}
            fill={axis.labelColor ?? axis.color}
          >
            {axis.label}
          </Text>
        );
      })}
    </Svg>
  );
}

/* ============================================================ pathway === */

const pathway = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", marginTop: 10 },
  node: { flex: 1, alignItems: "stretch" },
  nodeBox: {
    /* flexGrow, deliberately not `flex: 1`. The shorthand also sets
       flexBasis: 0, which drops the box's natural content height to zero —
       long pathway text then rendered outside its own border and collided
       with the section beneath it. Growing from an auto basis keeps the
       equal-height row without ever clipping the text. */
    flexGrow: 1,
    borderWidth: 0.75,
    borderColor: pdfColors.hairline,
    borderRadius: 5,
    width: "100%",
    minHeight: 74,
    overflow: "hidden",
  },
  nodeCap: { height: 3.5, width: "100%" },
  nodeInner: { paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" },
  nodeLabel: {
    fontSize: 6.75,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 4,
  },
  nodeText: { fontSize: 7.5, color: pdfColors.ink, textAlign: "center", lineHeight: 1.35 },
  arrowWrap: { justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
});

/** A compact horizontal education pathway, light to dark left to right. */
export function PdfEducationPathway({ nodes }: { nodes: { label: string; text: string }[] }) {
  const steps = [8, 0, 7, 3, 1].map((i) => pdfColors.decor[i].base);
  return (
    <View style={pathway.row}>
      {nodes.map((node, i) => (
        <View key={node.label} style={{ flexDirection: "row", flex: 1 }}>
          <View style={pathway.node}>
            <View
              style={[
                pathway.nodeBox,
                { backgroundColor: i === nodes.length - 1 ? pdfColors.panelAccent : pdfColors.page },
              ]}
            >
              <View style={[pathway.nodeCap, { backgroundColor: steps[i % steps.length] }]} />
              <View style={pathway.nodeInner}>
                <Text style={pathway.nodeLabel}>{node.label}</Text>
                <Text style={pathway.nodeText}>{node.text}</Text>
              </View>
            </View>
          </View>
          {i < nodes.length - 1 ? (
            <View style={pathway.arrowWrap}>
              <PdfArrow direction="right" length={11} color={pdfColors.hairlineStrong} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/* =========================================================== timeline === */

const timeline = StyleSheet.create({
  row: { flexDirection: "row" },
  railCol: { width: 26, alignItems: "center" },
  railDotWrap: { height: 22, justifyContent: "center", alignItems: "center" },
  railDot: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  railDotText: { fontSize: 6.75, fontFamily: "Helvetica-Bold" },
  railLine: { width: 1.5, flex: 1, borderRadius: 1 },
  body: { flex: 1, paddingBottom: 16, paddingLeft: 6 },
  bodyNow: {
    flex: 1,
    marginLeft: 2,
    marginBottom: 16,
    borderRadius: 5,
    backgroundColor: pdfColors.goldSoft,
    borderWidth: 0.75,
    borderColor: pdfColors.goldLine,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  stageHeadRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  stageLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  nowBadge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.inkInverse,
    backgroundColor: pdfColors.gold,
    borderRadius: 7,
    paddingVertical: 2,
    paddingHorizontal: 6,
    letterSpacing: 0.4,
  },
  stageTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 3 },
  stageDetail: { fontSize: 9.25, lineHeight: 1.5, color: pdfColors.inkMuted, marginTop: 4 },
});

export interface TimelineStage {
  label: string;
  title: string;
  detail: string;
  /** undefined when the student's grade is not known — renders neutrally, with no "done"/"now" claim */
  status?: "done" | "now" | "upcoming";
}

/** The 6-stage roadmap, rendered as a vertical timeline. When the student's grade is known, the
 *  stage they are currently at is marked NOW and earlier stages read as already covered — see
 *  lib/pdf/roadmapReportData.ts's buildStages(). Never claims a stage is "done" when the
 *  student's grade is not actually known. */
export function PdfStageTimeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <View style={{ marginTop: 6 }}>
      {stages.map((stage, i) => {
        const isNow = stage.status === "now";
        const isDone = stage.status === "done";
        /* Two encodings, kept apart. The dot is status — gold for where the
           student is, filled for covered, hollow for ahead. The stage's own
           hue rides on the label and the rail, so colour variety never
           overwrites the one thing on this chart that has to stay readable. */
        const hue = pdfColors.decor[i % pdfColors.decor.length];
        const dotBg = isNow ? pdfColors.gold : isDone ? hue.base : pdfColors.page;
        return (
          <View key={stage.label} style={timeline.row}>
            <View style={timeline.railCol}>
              <View style={timeline.railDotWrap}>
                <View
                  style={[
                    timeline.railDot,
                    {
                      backgroundColor: dotBg,
                      borderWidth: isNow || isDone ? 0 : 1.25,
                      borderColor: pdfColors.hairlineStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      timeline.railDotText,
                      { color: isNow || isDone ? pdfColors.inkInverse : pdfColors.inkFaint },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
              </View>
              {i < stages.length - 1 ? (
                <View style={[timeline.railLine, { backgroundColor: isDone ? hue.base : pdfColors.hairline }]} />
              ) : null}
            </View>
            <View style={isNow ? timeline.bodyNow : timeline.body}>
              <View style={timeline.stageHeadRow}>
                <Text style={[timeline.stageLabel, { color: hue.ink }]}>{stage.label}</Text>
                {isNow ? <Text style={timeline.nowBadge}>YOU ARE HERE</Text> : null}
              </View>
              <Text style={timeline.stageTitle}>{stage.title}</Text>
              <Text style={timeline.stageDetail}>{stage.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ========================================================== checklist === */

const checklist = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 9,
    backgroundColor: pdfColors.panel,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  box: {
    width: 10,
    height: 10,
    borderWidth: 1.25,
    borderColor: pdfColors.accentMuted,
    backgroundColor: pdfColors.page,
    borderRadius: 2,
    marginTop: 1,
  },
  text: { fontSize: 9.5, lineHeight: 1.45, color: pdfColors.ink, flex: 1 },
});

/** A checklist, not a card grid — for "Start Now" activities. */
export function PdfChecklist({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => {
        const hue = pdfColors.decor[i % pdfColors.decor.length];
        return (
          <View key={item} style={[checklist.row, { backgroundColor: hue.tint }]}>
            <View style={[checklist.box, { borderColor: hue.ink }]} />
            <Text style={checklist.text}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* =============================================================== misc === */

/**
 * A tinted chip. `hue` indexes lib/pdf/theme.ts's decorative palette and wraps,
 * so a list of any length cycles rather than running out of colours.
 */
export function PdfChip({
  label,
  hue,
  solid = false,
}: {
  label: string;
  hue: number;
  /** Filled rather than tinted — for the few chips that need more weight */
  solid?: boolean;
}) {
  const { base, tint, ink } = pdfColors.decor[hue % pdfColors.decor.length];
  return (
    <Text
      style={[
        s.chip,
        solid
          ? { backgroundColor: base, color: pdfColors.inkInverse, borderColor: base }
          : { backgroundColor: tint, color: ink, borderColor: tint },
      ]}
    >
      {label}
    </Text>
  );
}

/** A single small reference dot, for legends and rank markers. */
export function PdfDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </Svg>
  );
}

/**
 * The cover banner. Negative margins pull it out past the page padding so it
 * meets the paper edge on three sides.
 */
export function PdfCoverBanner({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View
      style={{
        backgroundColor: pdfColors.accentDeep,
        marginTop: -60,
        marginLeft: -44,
        marginRight: -44,
        paddingTop: 58,
        paddingBottom: 34,
        paddingHorizontal: 44,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Concentric arcs, bottom right — geometry, not data. */}
      <View style={{ position: "absolute", right: -34, bottom: -64 }}>
        <Svg width={190} height={190} viewBox="0 0 190 190">
          <Circle cx={95} cy={95} r={88} fill="none" stroke="#1d5766" strokeWidth={1.25} />
          <Circle cx={95} cy={95} r={64} fill="none" stroke="#1d5766" strokeWidth={1.25} />
          <Circle cx={95} cy={95} r={40} fill="none" stroke="#1d5766" strokeWidth={1.25} />
          <Circle cx={95} cy={95} r={16} fill={pdfColors.accent} />
        </Svg>
      </View>

      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#7fb3bd", letterSpacing: 2.4, marginBottom: 12 }}>
        {eyebrow}
      </Text>
      <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: pdfColors.inkInverse, lineHeight: 1.15, maxWidth: 360 }}>
        {title}
      </Text>
      <View style={{ width: 54, height: 3, borderRadius: 1.5, backgroundColor: pdfColors.gold, marginTop: 18 }} />
    </View>
  );
}

/**
 * The band that closes the cover. Mirrors PdfCoverBanner at the foot of the
 * page so the cover reads as a framed composition rather than a headline with
 * a long empty tail. Chrome only — it carries no information.
 */
export function PdfCoverFooterBand() {
  return (
    <View
      style={{
        marginTop: "auto",
        marginLeft: -44,
        marginRight: -44,
        marginBottom: -20,
        height: 86,
        backgroundColor: pdfColors.panelAccent,
        borderTopWidth: 2.5,
        borderTopColor: pdfColors.gold,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <View style={{ position: "absolute", left: -78, top: -62 }}>
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Circle cx={110} cy={110} r={104} fill="none" stroke={pdfColors.decor[8].base} strokeWidth={1.25} />
          <Circle cx={110} cy={110} r={76} fill="none" stroke={pdfColors.decor[5].base} strokeWidth={1.25} />
          <Circle cx={110} cy={110} r={48} fill="none" stroke={pdfColors.decor[0].base} strokeWidth={1.25} />
          <Circle cx={110} cy={110} r={22} fill="none" stroke={pdfColors.decor[3].base} strokeWidth={1.25} />
        </Svg>
      </View>
      <View style={{ position: "absolute", right: 44, bottom: 26, flexDirection: "row", gap: 5 }}>
        {[0, 1, 2, 3, 4, 6].map((i) => (
          <View
            key={i}
            style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: pdfColors.decor[i].base }}
          />
        ))}
      </View>
    </View>
  );
}

/** A flat coloured strip used to close out a page block — pure chrome. */
export function PdfRule({ color = pdfColors.hairline, height = 0.75 }: { color?: string; height?: number }) {
  return <View style={{ height, backgroundColor: color, borderRadius: height / 2 }} />;
}

/** A framed plate behind a drawn chart. */
export function PdfPlate({ width, height, children }: { width: number; height: number; children?: ReactNode }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} rx={4} fill={pdfColors.panel} />
      {children}
    </Svg>
  );
}
