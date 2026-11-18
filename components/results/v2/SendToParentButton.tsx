/**
 * "Send my results to my parent" - RESULT_PAGE_V2's child view. Opens
 * WhatsApp with a parent-addressed message and the parent's ?pay=1 link
 * (lib/askParent.ts). `primary` fills it (the post-tests paywall, where it
 * is the child's main action); otherwise it's an outline, so the snapshot
 * keeps one filled button.
 */
export function SendToParentButton({
  href,
  onTap,
  primary = false,
  className = "",
}: {
  href: string;
  onTap: () => void;
  primary?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onTap}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-center text-body font-semibold ${
          primary
            ? "bg-ok-700 text-white hover:bg-ok-700/90"
            : "border-2 border-ok-700 bg-surface text-ok-700 hover:bg-ok-700/10"
        }`}
      >
        <span aria-hidden="true">💬</span> Send my results to my parent
      </a>
      <p className="mt-1.5 text-center text-note text-text-secondary">
        Opens WhatsApp with a link for your parent to see them.
      </p>
    </div>
  );
}
