/**
 * Locked-content pieces shared by both free snapshots. Blurred rows are fixed
 * placeholder text - never a real value hidden with CSS - so nothing locked is
 * in the page, even blurred.
 */

export const FAKE_ROWS = ["xxxx xxxxxx", "xxxxxxx xxxx", "xxxxx xxxxxxxx", "xxxxxx xxxxx"];

export function BlurredRow({ text }: { text: string }) {
  return (
    <div className="flex select-none items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <span className="font-medium text-text blur-[5px]">{text}</span>
      <span className="h-1.5 w-12 shrink-0 rounded-full bg-accent-600/40 blur-[2px]" />
    </div>
  );
}

export function LockedRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-hairline bg-surface-sunk/60 px-4 py-3 text-left text-body text-text-secondary hover:bg-surface-sunk"
      >
        <span aria-hidden="true">🔒</span>
        <span>{label}</span>
      </button>
    </li>
  );
}

/** A titled card of blurred placeholder rows */
export function BlurredSection({ title, rows = FAKE_ROWS }: { title: string; rows?: string[] }) {
  return (
    <div aria-hidden="true" className="rounded-lg border border-hairline bg-surface p-4">
      <p className="text-note font-semibold text-text">{title}</p>
      <div className="mt-2">
        {rows.map((row, i) => (
          <BlurredRow key={i} text={row} />
        ))}
      </div>
    </div>
  );
}
