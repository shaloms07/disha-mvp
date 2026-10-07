/**
 * The free RIASEC snapshot, as a one-page PDF - sent over WhatsApp once the
 * test completes (server/routes/session.ts). Deliberately separate from
 * DeepDiveDocument.tsx: that one needs aptitude/personality/work-values
 * scores that only exist once a (currently mocked) paid tier is bought, which
 * no real free-funnel session has. This covers exactly what app/results/page.tsx
 * shows for a free session - nothing more.
 *
 * Built via a dynamic import() of @react-pdf/renderer rather than a static
 * one: this file is only ever used server-side (lib/whatsapp/messages.ts),
 * and the standalone server runs as plain CommonJS (no "type": "module"),
 * where a static import gets downleveled to require() - but
 * @react-pdf/renderer is ESM-only, so that require() fails to resolve its
 * subpath exports. A dynamic import() always goes through Node's real ESM
 * loader regardless of the caller's module type, which resolves cleanly.
 * The Next.js app's own (client-side, webpack-bundled) PDF components never
 * hit this, since bundler-level ESM/CJS interop is a different mechanism.
 */

import { TYPE_SUMMARIES, getHeadline, isFlatProfile } from "@/lib/interpretation";
import { MAX_TYPE_SCORE, rankTypes } from "@/lib/scoring";
import { pdfColors } from "@/lib/pdf/theme";
import type { RiasecType } from "@/types";

export async function buildSnapshotDocument({
  childName,
  scores,
}: {
  childName: string;
  scores: Record<RiasecType, number>;
}) {
  const { Document, Page, StyleSheet, Text, View } = await import("@react-pdf/renderer");

  const s = StyleSheet.create({
    page: { padding: 44, fontFamily: "Helvetica", fontSize: 10, color: "#1c2430" },
    eyebrow: { fontSize: 9, color: "#5b6472", letterSpacing: 1, textTransform: "uppercase" },
    title: { marginTop: 6, fontSize: 20, fontFamily: "Helvetica-Bold" },
    headline: { marginTop: 14, fontSize: 14, fontFamily: "Helvetica-Bold" },
    typeRow: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 0.75,
      borderBottomColor: "#e4e7eb",
      paddingBottom: 10,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    typeLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", width: 130 },
    typeScore: { fontSize: 10, color: "#5b6472", width: 50 },
    blurb: { flex: 1, fontSize: 9.5, color: "#3b4350" },
    footer: { marginTop: 28, fontSize: 9, color: "#5b6472", lineHeight: 1.5 },
  });

  const ranked = rankTypes(scores);
  const flat = isFlatProfile(scores);
  const highlighted = flat ? ranked.slice(0, 3) : ranked.slice(0, 2);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>My Life Coach — free snapshot</Text>
        <Text style={s.title}>
          {childName ? `${childName}'s interest snapshot` : "Interest snapshot"}
        </Text>
        <Text style={s.headline}>{getHeadline(scores, childName)}</Text>

        {highlighted.map((type) => {
          const summary = TYPE_SUMMARIES[type];
          return (
            <View key={type} style={s.typeRow}>
              <View style={[s.dot, { backgroundColor: pdfColors.riasec[type] }]} />
              <Text style={s.typeLabel}>{summary.label}</Text>
              <Text style={s.typeScore}>
                {scores[type]}/{MAX_TYPE_SCORE[type]}
              </Text>
              <Text style={s.blurb}>{summary.blurb}</Text>
            </View>
          );
        })}

        <Text style={s.footer}>
          This describes what {childName || "your child"} is drawn to — not how
          capable they are, and not a prediction of marks. Based on Holland's
          RIASEC model, from all 36 picks in the My Life Coach assessment.
        </Text>
      </Page>
    </Document>
  );
}
