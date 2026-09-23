/**
 * Shared @react-pdf/renderer building blocks for the Deep-Dive Assessment
 * Report. Restrained by design — thin separators, small-caps labels, muted
 * bars and a professional running header/footer — this is an interpretation
 * document, not the dashboard's card-grid aesthetic rebuilt in PDF form.
 */

import { Circle, Line, Polygon, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { pdfColors } from "./theme";

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

  eyebrow: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  divider: { height: 0.75, backgroundColor: pdfColors.hairline, marginVertical: 14 },

  barRow: { marginBottom: 10 },
  barHeadRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  barLabel: { fontSize: 9, color: pdfColors.ink },
  barValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.inkMuted },
  barTrack: { height: 5, borderRadius: 2, backgroundColor: pdfColors.panelStrong },
  barFill: { height: 5, borderRadius: 2 },

  bandPill: {
    fontSize: 7.75,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    color: "#ffffff",
    alignSelf: "flex-start",
  },

  flowRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  flowBox: {
    borderWidth: 0.75,
    borderColor: pdfColors.hairlineStrong,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  flowBoxText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: pdfColors.ink, textAlign: "center" },
  flowPlus: { fontSize: 11, color: pdfColors.inkFaint, marginHorizontal: 8 },
  flowArrowWrap: { alignItems: "center", marginVertical: 10 },
  flowArrow: { fontSize: 13, color: pdfColors.inkFaint },
  flowOutBox: {
    borderWidth: 0.75,
    borderColor: pdfColors.accent,
    backgroundColor: pdfColors.accentSoft,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  flowOutText: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: pdfColors.accent, textAlign: "center" },
});

/** Running header — repeats on every page it's placed on except the cover. */
export function PdfHeader({ section, reportTitle }: { section: string; reportTitle: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerBrand}>{reportTitle}</Text>
      <Text style={s.headerSection}>{section}</Text>
    </View>
  );
}

/** Running footer — page numbers plus report metadata, on every page it's placed on. */
export function PdfFooter({ assessmentId, generatedOn }: { assessmentId: string; generatedOn: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {assessmentId} · Generated {generatedOn}
      </Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function PdfEyebrow({ children }: { children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function PdfDivider() {
  return <View style={s.divider} />;
}

/** A labelled horizontal bar against a 0-100 (or any 0-max) scale. */
export function PdfBar({
  label,
  value,
  max,
  color = pdfColors.accent,
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  valueLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(2, (value / max) * 100)) : 2;
  return (
    <View style={s.barRow}>
      <View style={s.barHeadRow}>
        <Text style={s.barLabel}>{label}</Text>
        <Text style={s.barValue}>{valueLabel ?? `${value}/${max}`}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export type AlignmentBand = "Very Strong Alignment" | "Strong Alignment" | "Moderate Alignment" | "Developing Alignment";

const BAND_COLOR: Record<AlignmentBand, string> = {
  "Very Strong Alignment": pdfColors.band.veryStrong,
  "Strong Alignment": pdfColors.band.strong,
  "Moderate Alignment": pdfColors.band.moderate,
  "Developing Alignment": pdfColors.band.developing,
};

export function PdfAlignmentBand({ band }: { band: AlignmentBand }) {
  return (
    <Text style={[s.bandPill, { backgroundColor: BAND_COLOR[band] }]}>{band.toUpperCase()}</Text>
  );
}

/** INTEREST + APTITUDE + BEHAVIOR + VALUES -> CAREER EXPLORATION, as a restrained flow diagram. */
export function PdfPillarFlow({ inputs, output }: { inputs: string[]; output: string }) {
  return (
    <View>
      <View style={s.flowRow}>
        {inputs.map((label, i) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={s.flowBox}>
              <Text style={s.flowBoxText}>{label}</Text>
            </View>
            {i < inputs.length - 1 && <Text style={s.flowPlus}>+</Text>}
          </View>
        ))}
      </View>
      <View style={s.flowArrowWrap}>
        <Text style={s.flowArrow}>↓</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={s.flowOutBox}>
          <Text style={s.flowOutText}>{output}</Text>
        </View>
      </View>
    </View>
  );
}

/** Generic polygon radar — used for both the RIASEC and OCEAN charts, six or five axes. */
export function PdfRadar({
  axes,
  size = 210,
}: {
  axes: { key: string; label: string; value: number; max: number; color: string }[];
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

  const dataPolygon = axes
    .map((axis, i) => {
      const ratio = axis.max > 0 ? Math.min(1, Math.max(0, axis.value / axis.max)) : 0;
      return point(maxRadius * ratio, i).join(",");
    })
    .join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={ring(0.33)} stroke={pdfColors.hairline} strokeWidth={0.75} fill="none" />
      <Polygon points={ring(0.66)} stroke={pdfColors.hairline} strokeWidth={0.75} fill="none" />
      <Polygon points={ring(1)} stroke={pdfColors.hairlineStrong} strokeWidth={0.75} fill="none" />
      {axes.map((axis, i) => {
        const [x, y] = point(maxRadius, i);
        return <Line key={axis.key} x1={cx} y1={cy} x2={x} y2={y} stroke={pdfColors.hairline} strokeWidth={0.75} />;
      })}
      <Polygon
        points={dataPolygon}
        stroke={pdfColors.accent}
        strokeWidth={1.5}
        fill={pdfColors.accent}
        fillOpacity={0.12}
      />
      {axes.map((axis, i) => {
        const [x, y] = point(maxRadius + 16, i);
        return (
          <Text
            key={axis.key}
            x={x}
            y={y + 3}
            textAnchor="middle"
            style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold" }}
            fill={axis.color}
          >
            {axis.label}
          </Text>
        );
      })}
    </Svg>
  );
}

const pathway = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", marginTop: 8 },
  node: { flex: 1, alignItems: "center" },
  nodeBox: {
    borderWidth: 0.75,
    borderColor: pdfColors.hairlineStrong,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    width: "100%",
    minHeight: 46,
    justifyContent: "center",
  },
  nodeLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center", marginBottom: 3 },
  nodeText: { fontSize: 7.75, color: pdfColors.ink, textAlign: "center", lineHeight: 1.3 },
  arrow: { fontSize: 11, color: pdfColors.inkFaint, marginHorizontal: 2, marginTop: 14 },
});

/** A compact horizontal education pathway — Grade 8-10 -> ... -> Entry-level career, career-specific text per node. */
export function PdfEducationPathway({ nodes }: { nodes: { label: string; text: string }[] }) {
  return (
    <View style={pathway.row}>
      {nodes.map((node, i) => (
        <View key={node.label} style={{ flexDirection: "row", flex: 1, alignItems: "flex-start" }}>
          <View style={pathway.node}>
            <View style={pathway.nodeBox}>
              <Text style={pathway.nodeLabel}>{node.label}</Text>
              <Text style={pathway.nodeText}>{node.text}</Text>
            </View>
          </View>
          {i < nodes.length - 1 && <Text style={pathway.arrow}>→</Text>}
        </View>
      ))}
    </View>
  );
}

const timeline = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 2 },
  railCol: { width: 22, alignItems: "center" },
  railDotWrap: { height: 20, justifyContent: "center", alignItems: "center" },
  railDot: { width: 9, height: 9, borderRadius: 4.5 },
  railLine: { width: 1.25, flex: 1, backgroundColor: pdfColors.hairlineStrong },
  body: { flex: 1, paddingBottom: 14, paddingLeft: 8 },
  stageHeadRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  stageLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pdfColors.accentMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  nowBadge: {
    fontSize: 6.75,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: pdfColors.accent,
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
  },
  stageTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: pdfColors.ink, marginTop: 2 },
  stageDetail: { fontSize: 8.75, lineHeight: 1.45, color: pdfColors.inkMuted, marginTop: 3 },
});

export interface TimelineStage {
  label: string;
  title: string;
  detail: string;
  /** undefined when the student's grade isn't known — renders neutrally, with no "done"/"now" claim */
  status?: "done" | "now" | "upcoming";
}

/** The 6-stage roadmap, rendered as a vertical timeline. When the student's grade is known, the
 *  stage they're currently at is marked NOW and earlier stages read as already covered — see
 *  lib/pdf/roadmapReportData.ts's buildStageTimeline(). Never claims a stage is "done" when the
 *  student's grade isn't actually known. */
export function PdfStageTimeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <View style={{ marginTop: 6 }}>
      {stages.map((stage, i) => (
        <View key={stage.label} style={timeline.row}>
          <View style={timeline.railCol}>
            <View style={timeline.railDotWrap}>
              <View
                style={[
                  timeline.railDot,
                  {
                    backgroundColor:
                      stage.status === "now" ? pdfColors.accent : stage.status === "done" ? pdfColors.hairlineStrong : pdfColors.page,
                    borderWidth: stage.status === "upcoming" || !stage.status ? 1.25 : 0,
                    borderColor: pdfColors.hairlineStrong,
                  },
                ]}
              />
            </View>
            {i < stages.length - 1 && <View style={timeline.railLine} />}
          </View>
          <View style={timeline.body}>
            <View style={timeline.stageHeadRow}>
              <Text style={timeline.stageLabel}>{stage.label}</Text>
              {stage.status === "now" && <Text style={timeline.nowBadge}>YOU ARE HERE</Text>}
            </View>
            <Text style={timeline.stageTitle}>{stage.title}</Text>
            <Text style={timeline.stageDetail}>{stage.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const checklist = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7, gap: 7 },
  box: { width: 9, height: 9, borderWidth: 1, borderColor: pdfColors.accentMuted, borderRadius: 2, marginTop: 1.5 },
  text: { fontSize: 9, lineHeight: 1.45, color: pdfColors.ink, flex: 1 },
});

/** A checklist, not a card grid — for "Start Now" activities. */
export function PdfChecklist({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={checklist.row}>
          <View style={checklist.box} />
          <Text style={checklist.text}>{item}</Text>
        </View>
      ))}
    </View>
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
