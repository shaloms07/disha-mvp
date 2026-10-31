import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { INVITES_NEEDED } from "@/lib/invite";
import { trackCustomEvent } from "@/lib/meta/pixel";
import {
  COMPARE_AT_PRICES,
  RESULTS_PAGE_LEVELS,
  TIER_OPTIONS,
  formatInr,
  totalForLevel,
  upgradeCost,
  type TierLevel,
} from "@/lib/pricing";

type PaidLevel = Exclude<TierLevel, 0>;

/** How the free route works, and how far along it is - a count only, never
 *  who joined. */
function InviteProgress({ joined }: { joined: number }) {
  const count = Math.min(joined, INVITES_NEEDED);
  return (
    <div className="mt-3 text-note text-text-secondary">
      {count > 0 ? (
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex gap-1">
            {Array.from({ length: INVITES_NEEDED }, (_, i) => (
              <span key={i} className={cn("block size-2.5 rounded-full", i < count ? "bg-ok-700" : "bg-surface-sunk")} />
            ))}
          </span>
          <span className="font-medium text-ok-700">
            {count} of {INVITES_NEEDED} parents joined
          </span>
        </div>
      ) : null}
      <p className={count > 0 ? "mt-1.5" : undefined}>
        Share your link in a parents&apos; WhatsApp group. Once {INVITES_NEEDED} parents register with it, we&apos;ll
        send you the report on WhatsApp, free.
      </p>
    </div>
  );
}

/**
 * The three options sold on /results (lib/pricing.ts's RESULTS_PAGE_LEVELS),
 * minus any already owned. Once a tier is owned, the rest show what an
 * upgrade costs now - the difference, which is exactly what
 * server/routes/checkout.ts charges.
 */
export function OfferCards({
  childName,
  ownedLevel,
  busyLevel,
  onSelect,
  askParentHref,
  invite,
}: {
  childName?: string;
  ownedLevel: TierLevel;
  busyLevel: PaidLevel | null;
  onSelect: (level: PaidLevel) => void;
  askParentHref?: string;
  /** "Invite 3 parents" share link and how many have joined - only once the
   *  server has issued an invite code (lib/invite.ts) */
  invite?: { href: string; joined: number };
}) {
  const name = childName || "your child";
  const possessive = childName ? `${childName}'s` : "your child's";
  const levels = RESULTS_PAGE_LEVELS.filter((level) => level > ownedLevel);
  if (levels.length === 0) return null;

  return (
    <section id="offer" className="mt-16 scroll-mt-6">
      <h2 className="text-h2 font-semibold text-text">
        {ownedLevel === 0 ? `Unlock ${possessive} career plan` : `Go further for ${name}`}
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        {ownedLevel === 0
          ? "Start small, or go all the way. Every option is a one-time payment."
          : `What you've already paid (${formatInr(totalForLevel(ownedLevel))}) is credited.`}
      </p>

      <div className="mt-8 space-y-6">
        {levels.map((level, i) => {
          const option = TIER_OPTIONS.find((t) => t.level === level)!;
          const highlighted = i === 0;
          const badge = level === 1 ? "Start here" : level === 3 ? "Most complete" : undefined;
          const price = upgradeCost(level, ownedLevel);
          const compareAt = ownedLevel === 0 ? COMPARE_AT_PRICES[level] : undefined;
          return (
            <div
              key={level}
              className={cn(
                "relative rounded-xl bg-surface p-5 sm:p-6",
                highlighted ? "border-2 border-accent-600 shadow-feature" : "border border-hairline",
              )}
            >
              {badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-5 rounded-full px-3 py-0.5 text-note font-semibold text-white",
                    level === 1 ? "bg-accent-600" : "bg-brand-800",
                  )}
                >
                  {badge}
                </span>
              )}
              <h3 className="text-h3 font-semibold text-text">{option.name}</h3>
              <p className="mt-1 font-display text-h2 font-semibold text-text">
                {formatInr(price)}
                {compareAt && (
                  <s className="ml-2 font-sans text-body font-normal text-text-muted">{formatInr(compareAt)}</s>
                )}
                <span className="ml-2 font-sans text-note font-normal text-text-muted">
                  {ownedLevel === 0 ? "one-time" : "more"}
                </span>
              </p>
              {compareAt && (
                <p className="mt-1 text-note font-medium text-accent-700">
                  Launch price · save {formatInr(compareAt - price)}
                </p>
              )}              <ul className="mt-4 space-y-1.5 text-body text-text">
                {option.includes.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
                    {item}
                  </li>
                ))}
              </ul>
              {level === 1 && (
                <p className="mt-4 rounded-lg bg-ok-700/10 px-3 py-2 text-note text-ok-700">
                  ✓ {formatInr(option.total)} is credited if you upgrade later
                </p>
              )}
              <div className={cn("mt-5 grid gap-3", level === 1 && invite && "sm:grid-cols-2")}>
                <Button
                  variant={highlighted ? "accent" : level === 3 ? "primary" : "secondary"}
                  size="lg"
                  className="w-full"
                  loading={busyLevel === level}
                  loadingText="Opening checkout"
                  disabled={busyLevel !== null}
                  onClick={() => onSelect(level)}
                >
                  {level === 1
                    ? `Unlock for ${formatInr(price)}`
                    : level === 3
                      ? ownedLevel === 0
                        ? "Get the complete report"
                        : `Upgrade for ${formatInr(price)}`
                      : "Choose with counsellor"}
                </Button>
                {level === 1 && invite && (
                  <a
                    href={invite.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackCustomEvent("InviteShared", { joined: invite.joined })}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-ok-700 px-5 text-body font-semibold text-ok-700 hover:bg-ok-700/10"
                  >
                    Invite {INVITES_NEEDED} parents · get it free
                  </a>
                )}
              </div>
              {level === 1 && invite && <InviteProgress joined={invite.joined} />}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-note text-text-muted">
        Pay by UPI (GPay, PhonePe, Paytm), card or netbanking · secured by Razorpay
      </p>
      {askParentHref && (
        <a
          href={askParentHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-ok-700/30 bg-ok-700/10 px-5 text-body font-medium text-ok-700 hover:bg-ok-700/15"
        >
          💬 Not the parent? Ask a parent to unlock
        </a>
      )}
    </section>
  );
}
