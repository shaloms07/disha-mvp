/**
 * Precise timestamp display for the admin dashboard - full date, time and
 * seconds, with the exact ISO instant available on hover (`title`). Replaces
 * the day/month/hour/minute-only formatting the dashboard used before, which
 * couldn't distinguish two events seconds apart.
 */
export function AdminTimestamp({ iso, fallback = "—" }: { iso?: string; fallback?: string }) {
  if (!iso) return <span className="text-text-muted">{fallback}</span>;
  const date = new Date(iso);
  const formatted = date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return <time dateTime={iso} title={iso}>{formatted}</time>;
}
