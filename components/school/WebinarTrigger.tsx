"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { mockScheduleWebinar } from "@/lib/school/mockSchoolApi";
import {
  dissonanceRows,
  mostStatedPreferences,
  summarise,
} from "@/lib/school/aggregates";
import { MockNotice, Modal } from "./DashboardUi";

/**
 * The action the dissonance index is meant to lead to.
 *
 * The suggested topic is not hardcoded — it is the career parents name most
 * often that matches least often, pulled from the same aggregates the index
 * above is built on, so the button stays honest if the data changes.
 */
export function WebinarTrigger({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const rows = dissonanceRows();
  const summary = summarise(rows);
  const preferences = mostStatedPreferences(rows);
  const worst = preferences.length
    ? preferences.reduce((a, b) => (b.dissonant > a.dissonant ? b : a))
    : null;
  const topic = worst
    ? `Beyond ${worst.title.split(" (")[0]}: reading your child's results`
    : "Reading your child's results together";

  async function handleConfirm() {
    setSending(true);
    await mockScheduleWebinar(topic);
    setSending(false);
    setOpen(false);
    onToast(`Webinar "${topic}" drafted — no invitations were sent.`);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Schedule a parent webinar
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule a parent webinar"
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              loading={sending}
              loadingText="Scheduling"
              onClick={handleConfirm}
            >
              Schedule and invite
            </Button>
          </>
        }
      >
        <p className="text-body text-text-secondary">
          {worst ? (
            <>
              Suggested because{" "}
              <strong className="font-medium text-text">
                {worst.dissonant} of the {worst.stated} parents
              </strong>{" "}
              who named {worst.title} have a child whose top three matches do
              not include it.
            </>
          ) : (
            "No parent has named a career yet, so this is the general session rather than a targeted one."
          )}
        </p>

        <dl className="mt-5 space-y-3 rounded-lg border border-hairline bg-surface-sunk px-4 py-3.5 text-body">
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-text-secondary">Topic</dt>
            <dd className="font-medium text-text">{topic}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-text-secondary">Audience</dt>
            <dd className="font-medium text-text">
              {summary.dissonant} parents flagged as divergent
            </dd>
          </div>
        </dl>

        <MockNotice className="mt-5">
          Nothing is scheduled and no invitation is sent. Confirming only shows
          the state a real integration would produce.
        </MockNotice>
      </Modal>
    </>
  );
}
