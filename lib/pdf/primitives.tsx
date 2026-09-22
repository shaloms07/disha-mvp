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

/** A single small reference dot, for legends and rank markers. */
export function PdfDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </Svg>
  );
}
