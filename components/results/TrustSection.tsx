import { COUNSELLOR } from "@/lib/resultsPageConfig";

const FAQS = [
  {
    q: "Is this scientific?",
    a: "It uses Holland's RIASEC model, the most widely used framework in career guidance. It shows what your child enjoys, not a fixed prediction.",
  },
  {
    q: "How long does the full assessment take?",
    a: "About 35 minutes, in three short sections. Progress saves, so it can be paused anytime.",
  },
  {
    q: "My child is in Class 8. Is it too early?",
    a: "No — it's the best time to explore, well before the stream choice after Class 10.",
  },
  {
    q: "Who is the counsellor call with?",
    a: "A qualified career counsellor from our team, by phone or video, at a time you choose.",
  },
];

/**
 * "Who's behind this" - counsellor, method and common questions. Off for now:
 * shown only when SHOW_TRUST_SECTION is on in lib/resultsPageConfig.ts.
 * Testimonials are deliberately absent until real ones are collected.
 */
export function TrustSection() {
  return (
    <section className="mt-16">
      <h2 className="text-h2 font-semibold text-text">Who&apos;s behind this</h2>
      <div className="mt-6 rounded-xl border border-hairline bg-surface p-5 sm:p-6">
        {COUNSELLOR.name && (
          <div className="flex items-center gap-4">
            {COUNSELLOR.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={COUNSELLOR.photo} alt="" className="size-14 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="font-semibold text-text">{COUNSELLOR.name}</p>
              {COUNSELLOR.credentials && <p className="text-note text-text-muted">{COUNSELLOR.credentials}</p>}
            </div>
          </div>
        )}
        <p className="mt-4 text-body text-text-secondary">
          Built on Holland&apos;s RIASEC model — the career-interest framework used by counsellors worldwide.
        </p>
      </div>

      <div className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-surface px-5 sm:px-6">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-text">
              {faq.q}
              <span aria-hidden="true" className="text-text-muted group-open:hidden">+</span>
              <span aria-hidden="true" className="hidden text-text-muted group-open:inline">−</span>
            </summary>
            <p className="mt-2 text-body text-text-secondary">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
