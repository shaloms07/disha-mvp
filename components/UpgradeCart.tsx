"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/context/SessionContext";
import { mockCheckout } from "@/lib/mockApi";
import {
  addOnTotal,
  applyAddOns,
  availableAddOns,
  formatInr,
  resolveAddOnSelection,
  ADD_ON_CATALOG,
  type AddOnKey,
} from "@/lib/pricing";
import type { SelectedTiers } from "@/types";

/**
 * The report page's "add what you skipped" cart. Shown wherever roadmap or
 * consultation content is gated off — see app/report-preview/page.tsx.
 *
 * Each item has its own flat price (lib/pricing.ts's LATE_ADD_ON_PRICING);
 * picking both is just their sum, same "no fake discount" rule the /pricing
 * ladder follows. Checking Consultation auto-checks (and locks) Roadmap,
 * since the ladder still requires one before the other.
 */
export function UpgradeCart({ tiers }: { tiers: SelectedTiers }) {
  const { updateSession } = useSession();
  const items = availableAddOns(tiers);
  const [selected, setSelected] = useState<Set<AddOnKey>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (items.length === 0) {
    // Nothing left to add — but if that's *because* the last add just went
    // through, stay mounted long enough to say so rather than vanishing
    // mid-confirmation.
    if (!justAdded) return null;
    return (
      <Card tone="feature" className="mt-16">
        <h2 className="text-h2 font-semibold text-white">Added to your report</h2>
        <p className="mt-4 text-body text-brand-100">
          Scroll down — your report now includes it.
        </p>
      </Card>
    );
  }

  const resolved = resolveAddOnSelection(selected);
  const total = addOnTotal(tiers, selected);

  function toggle(key: AddOnKey) {
    setJustAdded(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Roadmap can't be removed while Consultation still needs it.
        if (key === "roadmap") next.delete("consultation");
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || processing) return;
    setProcessing(true);
    const nextTiers = applyAddOns(tiers, selected);
    const { orderId } = await mockCheckout(nextTiers);
    updateSession({ selectedTiers: nextTiers, orderId });
    setProcessing(false);
    setSelected(new Set());
    setJustAdded(true);
  }

  return (
    <Card tone="feature" className="mt-16">
      <h2 className="text-h2 font-semibold text-white">
        {items.length === 1 ? "One more thing you can add" : "Add to your report"}
      </h2>
      <p className="mt-4 text-body text-brand-100">
        {items.length === 1
          ? "Schedule a call with a career counsellor whenever you're ready."
          : "Pick up anything you skipped. Priced on its own, since you're adding it after the fact rather than upfront."}
      </p>

      <fieldset className="mt-7 space-y-3" disabled={processing}>
        <legend className="sr-only">Choose what to add to your report</legend>
        {items.map((item) => {
          const checked = resolved.has(item.key);
          const locked = item.key === "roadmap" && selected.has("consultation");
          // Roadmap is waived (shown as Free) whenever it's only along for
          // the ride because Consultation was picked — see lib/pricing.ts's
          // addOnLines for the same rule applied to the cart total.
          const waived = locked;
          // Only worth mentioning if the required item isn't already owned —
          // otherwise there's nothing being "included automatically".
          const requiresName =
            item.requires && !tiers[item.requires]
              ? ADD_ON_CATALOG.find((i) => i.key === item.requires)?.name
              : undefined;

          return (
            <label
              key={item.key}
              className={cn(
                "flex min-h-16 cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 transition-colors",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-400",
                locked && "cursor-not-allowed",
                checked
                  ? "border-accent-600 bg-accent-600/15"
                  : "border-white/20 bg-white/5 hover:border-white/40",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                onChange={() => toggle(item.key)}
                className="mt-1 size-5 shrink-0 accent-accent-600"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-body font-medium text-white">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-body tabular-nums",
                      waived ? "text-accent-400" : "text-white",
                    )}
                  >
                    {waived ? "Free" : formatInr(item.price)}
                  </span>
                </span>
                <span className="mt-1 block text-note text-brand-100">
                  {item.includes[0]}
                </span>
                {requiresName && (
                  <span className="mt-1 block text-note text-brand-100/70">
                    Includes {requiresName} — free, bundled with{" "}
                    {item.name}.
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6 flex items-baseline justify-between border-t border-white/15 pt-6">
        <span className="text-body font-medium text-white">Cart total</span>
        <span className="font-mono text-h2 tabular-nums text-white">
          {formatInr(total)}
        </span>
      </div>

      <Button
        variant="accent"
        size="lg"
        className="mt-6 w-full sm:w-auto"
        onClick={handleAdd}
        loading={processing}
        loadingText="Adding to your report"
        aria-disabled={selected.size === 0}
      >
        {selected.size === 0
          ? "Select something to add"
          : `Add to report · ${formatInr(total)}`}
      </Button>

      <p aria-live="polite" className="sr-only">
        {justAdded ? "Added to your report." : ""}
      </p>
      {justAdded && (
        <p className="mt-4 text-note text-brand-100">
          Added — scroll down, your report now includes it.
        </p>
      )}

      <p className="mt-5 text-note text-brand-100/75">
        Demo build — no payment is taken and no card details are collected.
      </p>
    </Card>
  );
}
