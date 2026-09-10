"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";
import {
  MAX_TYPE_SCORE,
  MIN_TYPE_SCORE,
  rankTypes,
  scoreToPercent,
} from "@/lib/scoring";
import { RIASEC_LABELS, RIASEC_TYPES, type RiasecType } from "@/types";

/** One validated colour per type. Used only inside charts. */
export const RIASEC_COLORS: Record<RiasecType, string> = {
  R: "var(--color-riasec-r)",
  I: "var(--color-riasec-i)",
  A: "var(--color-riasec-a)",
  S: "var(--color-riasec-s)",
  E: "var(--color-riasec-e)",
  C: "var(--color-riasec-c)",
};

interface Props {
  scores: Record<RiasecType, number>;
  /** The bar list below the radar — also the chart's text equivalent */
  showBreakdown?: boolean;
  /** The single motion moment in the product */
  animate?: boolean;
  className?: string;
}

interface TickProps {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value?: string };
}

/** Axis label: the letter in its own colour, nudged clear of the polygon. */
function AxisTick({ x, y, cx, cy, payload }: TickProps) {
  const type = payload?.value as RiasecType | undefined;
  if (!type || x === undefined || y === undefined) return null;

  const dx = cx !== undefined ? (x - cx) * 0.13 : 0;
  const dy = cy !== undefined ? (y - cy) * 0.13 : 0;

  return (
    <text
      x={x + dx}
      y={y + dy}
      textAnchor="middle"
      dominantBaseline="central"
      fill={RIASEC_COLORS[type]}
      fontSize={15}
      fontWeight={600}
    >
      {type}
    </text>
  );
}

/**
 * The child's six RIASEC totals.
 *
 * Two readings of one profile: the radar shows its *shape*, which is what
 * lib/matching.ts actually compares against each career; the bars below give
 * the accurate magnitude and carry every value as text, so colour is never
 * the only encoding.
 *
 * No legend, no radius ticks, and only two faint rings — the coloured axis
 * letters and the labelled bars carry the reading.
 */
export function RiasecRadarChart({
  scores,
  showBreakdown = true,
  animate = false,
  className,
}: Props) {
  const ranked = rankTypes(scores);

  const data = RIASEC_TYPES.map((type) => ({
    type,
    label: RIASEC_LABELS[type],
    value: scores[type],
  }));

  const summary = ranked
    .map((t) => `${RIASEC_LABELS[t]} ${scores[t]} out of ${MAX_TYPE_SCORE}`)
    .join(", ");

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("h-64 w-full sm:h-80", animate && "disha-chart-draw")}
        role="img"
        aria-label={`RIASEC profile, strongest first: ${summary}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            outerRadius="68%"
            margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
          >
            <PolarGrid
              gridType="polygon"
              stroke="var(--color-hairline)"
              strokeWidth={1}
              polarRadius={[40, 78]}
            />
            <PolarAngleAxis dataKey="type" tick={<AxisTick />} />
            <PolarRadiusAxis
              domain={[MIN_TYPE_SCORE, MAX_TYPE_SCORE]}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="var(--color-brand-700)"
              strokeWidth={1.75}
              strokeLinejoin="round"
              fill="var(--color-brand-700)"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {showBreakdown && (
        <ul className="mt-6 space-y-3.5">
          {ranked.map((type, i) => (
            <li key={type} className="flex items-center gap-4">
              <span className="w-[5.5rem] shrink-0 text-note text-text-secondary sm:w-32">
                {RIASEC_LABELS[type]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    animate && "disha-bar-grow",
                  )}
                  style={{
                    width: `${Math.max(scoreToPercent(scores[type]), 2)}%`,
                    backgroundColor: RIASEC_COLORS[type],
                    animationDelay: animate ? `${260 + i * 70}ms` : undefined,
                  }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-note tabular-nums text-text">
                {scores[type]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
