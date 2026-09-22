/**
 * PDF design tokens for the Deep-Dive Assessment Report.
 *
 * Deliberately its own palette, not a 1:1 copy of app/globals.css's consumer
 * theme — the brief calls for a restrained, clinical-professional document
 * (light neutral ground, dark navy/charcoal type, one muted accent), which
 * reads calmer than the marketing site's warm bone/bronze palette. RIASEC
 * hues are the one place multiple colours appear, reused from the app's own
 * validated set since that chart needs six distinguishable categories.
 */

export const pdfColors = {
  page: "#ffffff",
  panel: "#f4f6f8",
  panelStrong: "#eceff2",

  ink: "#1c2430",
  inkMuted: "#5b6472",
  inkFaint: "#8b93a1",
  hairline: "#d9dde3",
  hairlineStrong: "#c3c9d1",

  accent: "#12414d",
  accentMuted: "#4c6b74",
  accentSoft: "#e7edee",

  ok: "#3d6f79",
  warn: "#8a6a2f",

  /** Interest-profile chart only — validated categorical hues, never used as chrome. */
  riasec: {
    R: "#ad4036",
    I: "#275ca8",
    A: "#be74b4",
    S: "#2e885b",
    E: "#bfa32b",
    C: "#0394a6",
  },

  /** Qualitative alignment bands, darkest = strongest. */
  band: {
    veryStrong: "#12414d",
    strong: "#3d6f79",
    moderate: "#7c8894",
    developing: "#a8b0b9",
  },
} as const;

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PAGE_MARGIN = 44;
