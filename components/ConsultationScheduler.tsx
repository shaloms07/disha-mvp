"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/context/SessionContext";
import { getConsultationSlots } from "@/lib/consultationSlots";
import { mockBookConsultation } from "@/lib/mockApi";

/**
 * The tier-3 1:1 consultation add-on, shown on /report-preview once the
 * report itself is ready. Booking a slot is mocked end to end (see
 * lib/mockApi.ts's mockBookConsultation) — there's no real counsellor
 * calendar behind this, same as the rest of the funnel.
 */
export function ConsultationScheduler({ childName }: { childName?: string }) {
  const { session, updateSession } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  if (session.consultationBooking) {
    const { slotLabel, bookingId } = session.consultationBooking;
    return (
      <Card tone="quiet" className="mt-16">
        <h2 className="text-h3 font-semibold text-text">
          Your consultation is booked
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          {slotLabel} — booking reference {bookingId}.
        </p>
        <p className="mt-4 text-note text-text-muted">
          Demo build — no real counsellor calendar exists behind this. In the
          live product a calendar invite would follow.
        </p>
      </Card>
    );
  }

  const slots = getConsultationSlots();

  async function handleConfirm() {
    if (!selectedId || booking) return;
    const slot = slots.find((s) => s.id === selectedId);
    if (!slot) return;

    setBooking(true);
    const { bookingId } = await mockBookConsultation(slot.label);
    updateSession({
      consultationBooking: { slotLabel: slot.label, bookingId },
    });
    setBooking(false);
  }

  return (
    <Card tone="feature" className="mt-16">
      <h2 className="text-h2 font-semibold text-white">
        Schedule your 1:1 consultation
      </h2>
      <p className="mt-4 text-body text-brand-100">
        Pick a time for a 45-minute call with a career counsellor to go over{" "}
        {childName ? `${childName}'s` : "the"} result.
      </p>

      <fieldset className="mt-7 space-y-2.5" disabled={booking}>
        <legend className="sr-only">Choose a consultation slot</legend>
        {slots.map((slot) => {
          const selected = selectedId === slot.id;
          return (
            <label
              key={slot.id}
              className={cn(
                "flex min-h-13 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-400",
                selected
                  ? "border-accent-600 bg-accent-600 text-white"
                  : "border-white/20 bg-white/5 text-white hover:border-white/40",
              )}
            >
              <input
                type="radio"
                name="consultation-slot"
                checked={selected}
                onChange={() => setSelectedId(slot.id)}
                className="sr-only"
              />
              <span className="text-body">{slot.label}</span>
            </label>
          );
        })}
      </fieldset>

      <Button
        variant="accent"
        size="lg"
        className="mt-7 w-full sm:w-auto"
        onClick={handleConfirm}
        loading={booking}
        loadingText="Booking"
        aria-disabled={!selectedId}
      >
        {selectedId ? "Confirm booking" : "Pick a time first"}
      </Button>

      <p className="mt-5 text-note text-brand-100/75">
        Demo build — nothing is actually booked or emailed; no real
        counsellor calendar exists behind this.
      </p>
    </Card>
  );
}
