import { Card } from "@/components/ui/Card";

/**
 * The tier-4 1:1 consultation add-on, shown on /report-preview once the
 * report itself is ready. There is no self-service calendar yet (Calendly
 * integration is deferred — see this project's "tier pricing report content"
 * notes) — the honest minimal version of this is a human follow-up call
 * rather than a fake slot picker, so that's what this renders.
 */
export function ConsultationScheduler({ childName }: { childName?: string }) {
  return (
    <Card tone="feature" className="mt-16">
      <h2 className="text-h2 font-semibold text-white">
        Your 1:1 consultation is included
      </h2>
      <p className="mt-4 text-body text-brand-100">
        There&apos;s no self-service calendar yet — our team will call within
        24 hours to schedule a 45-minute call with a career counsellor to go
        over {childName ? `${childName}'s` : "the"} result at a time that
        works for you.
      </p>
    </Card>
  );
}
