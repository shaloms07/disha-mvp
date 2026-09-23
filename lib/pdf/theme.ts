/**
 * PDF design tokens for the Deep-Dive Assessment Report.
 *
 * A calm, professional document that still has colour in it: a deep teal
 * brand spine, one warm gold reserved for "this is the important one", and
 * tinted panels instead of an all-white page. Deliberately its own palette,
 * not a 1:1 copy of app/globals.css's consumer theme — the brief calls for a
 * report a parent can keep, which reads calmer than the marketing site's warm
 * bone/bronze palette.
 *
 * Colour is used in exactly three ways, and never mixed between them:
 *
 *   1. CATEGORICAL — the six RIASEC hues, and only ever for RIASEC. These
 *      were validated for colour-vision-deficient separation as a set; do not
 *      re-use them for anything else, and do not add a seventh.
 *   2. SEQUENTIAL — `ramp`, one hue light-to-dark, for magnitude (bar fills,
 *      alignment bands, rank emphasis). Never a rainbow.
 *   3. RESERVED — `gold` marks the current/leading item and nothing else;
 *      `warn` is the data-quality state. Neither is ever "another series".
 */

export const pdfColors = {
  page: "#ffffff",
  panel: "#f4f6f8",
  panelStrong: "#eceff2",
  /** A faint tint of the brand hue — for cards that should read as "ours" rather than grey. */
  panelAccent: "#eef3f4",

  ink: "#1c2430",
  inkMuted: "#5b6472",
  inkFaint: "#8b93a1",
  inkInverse: "#ffffff",
  hairline: "#d9dde3",
  hairlineStrong: "#c3c9d1",

  accent: "#12414d",
  accentMuted: "#4c6b74",
  accentSoft: "#e7edee",
  /** The darkest step — cover banner, table headers, anything reversed-out. */
  accentDeep: "#0b2e37",

  /** Reserved highlight. "You are here", the top-ranked item, the one thing to look at first. */
  gold: "#9a6f1e",
  goldSoft: "#fbf2e0",
  goldLine: "#e0c489",

  ok: "#3d6f79",
  warn: "#8a6a2f",
  warnSoft: "#fbf3e4",

  /**
   * The decorative palette: ten hue families, each as a fill, a pale tint for
   * chip backgrounds, and a darkened ink that clears 4.5:1 on both white and
   * its own tint.
   *
   * Used where colour is variety rather than encoding — pills, numbered
   * badges, diagram nodes, section caps. Those all carry a written label, so
   * nothing is lost if two hues look alike; what matters here is contrast,
   * which is checked, not separation. Data marks never draw from this set;
   * they use `riasec`, `aptitudeHue` or `traitHue`, which are.
   *
   * This replaced a single-hue light-to-dark ramp that was being used to imply
   * a hierarchy that mostly did not exist — the four assessment pillars are
   * not ranked, and neither are the five stages of an education pathway.
   */
  decor: [
    { base: "#0F5FA8", tint: "#E8F0F9", ink: "#0F5FA8" },
    { base: "#15855F", tint: "#E6F4EF", ink: "#0E7A57" },
    { base: "#D89A08", tint: "#FBF2DE", ink: "#8A6206" },
    { base: "#8E3F93", tint: "#F4EAF5", ink: "#8E3F93" },
    { base: "#B5401F", tint: "#FBEBE6", ink: "#B5401F" },
    { base: "#0F7B7B", tint: "#E4F2F2", ink: "#0F6B6B" },
    { base: "#B03A6B", tint: "#FBEAF0", ink: "#A33461" },
    { base: "#4B4FA8", tint: "#ECEDF8", ink: "#4045A0" },
    { base: "#62B0DC", tint: "#E9F4FA", ink: "#16688F" },
    { base: "#6A7D26", tint: "#F1F4E3", ink: "#59691F" },
  ],

  /**
   * Categorical hues — the report's one identity palette.
   *
   * Re-stepped from the app's original six, which collapsed under simulated
   * colour-vision deficiency: blue, orchid and cyan sat within dE 2 of each
   * other for protan and deutan viewers, i.e. indistinguishable. Every pair in
   * this set clears the dE floor under normal, protan, deutan and tritan
   * vision. Two pairs (I/S under tritan, I/C under protan-deutan) land in the
   * 6-8 band and are only used where a text label carries the identity too,
   * which is everywhere these appear.
   *
   * NOTE: app/globals.css still defines the older --color-riasec-* values for
   * the on-screen charts. The PDF and the web app therefore differ; syncing
   * globals.css to these is a separate, deliberate change.
   */
  riasec: {
    R: "#B5401F",
    I: "#0F5FA8",
    A: "#8E3F93",
    S: "#15855F",
    E: "#D89A08",
    C: "#62B0DC",
  },

  /**
   * Label-safe darkenings of the same six. The bright fills are tuned for
   * separation, not for 4.5:1 on white — amber and sky fail as small text — so
   * anything set as type uses these instead. Never use them as chart fills:
   * flattening the lightness range is what destroys dichromat separation.
   */
  riasecInk: {
    R: "#B5401F",
    I: "#0F5FA8",
    A: "#8E3F93",
    S: "#0E7A57",
    E: "#8A6206",
    C: "#1F7BA8",
  },

  /**
   * The same six as generic categorical slots, for the charts that are not
   * RIASEC. Fixed per entity — a domain or trait keeps its colour wherever it
   * appears, and never changes because its rank changed.
   */
  aptitudeHue: {
    numerical: "#0F5FA8",
    verbal: "#B5401F",
    spatial: "#D89A08",
  },
  traitHue: {
    openness: "#8E3F93",
    conscientiousness: "#0F5FA8",
    extraversion: "#D89A08",
    agreeableness: "#15855F",
    neuroticism: "#B5401F",
  },
  /** Cycled across the motivator bars, where the written label carries identity. */
  cycle: ["#0F5FA8", "#15855F", "#D89A08", "#8E3F93", "#B5401F", "#62B0DC"],

  /**
   * Alignment bands. Still an ordered scale — a reader must be able to tell
   * that Very Strong outranks Developing — but stepped across hues rather than
   * down one, and warm-to-cool-to-neutral so the order survives the change.
   * Every pill also prints its own name, and each base clears 4.5:1 against
   * the white text it carries.
   */
  band: {
    veryStrong: "#0E7A57",
    strong: "#0F5FA8",
    moderate: "#6B4FA8",
    developing: "#6E7683",
  },
} as const;

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PAGE_MARGIN = 44;

/** Usable content width inside the page margins — used by full-bleed and gutter maths. */
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
