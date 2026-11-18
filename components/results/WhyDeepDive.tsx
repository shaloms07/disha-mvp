/**
 * Step 2 on the free snapshot, after the ₹49 career list: the Complete
 * Career Report, sold through its 3 Deep-Dive tests. Why a list ranked on
 * interests isn't the whole answer, and what each test adds. The tests are
 * taken first and the report is paid for after (the original strategy) -
 * but they're presented as part of the report, not as a separate free step.
 *
 * Truthful by design - the ₹49 list IS interest-only (lib/pricing.ts's
 * TIER_OPTIONS[0].note), and the Deep-Dive explains each fit; never claim
 * careers are matched on ability.
 */
export function WhyDeepDive({ childName, reportPriceLabel }: { childName?: string; reportPriceLabel: string }) {
  const firstName = childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "this student";

  const reasons: { icon: string; title: string; body: string }[] = [
    {
      icon: "🎯",
      title: "Liking something isn't the same as being good at it",
      body: `The aptitude test shows where ${name}'s strengths lie.`,
    },
    {
      icon: "🤝",
      title: "How a person works matters as much as the subject",
      body: `The behaviour test shows how ${name} handles people, pressure and decisions.`,
    },
    {
      icon: "🔥",
      title: "The right career has to feel right later too",
      body: `The motivation test shows what ${name} wants from work — stability, creativity, helping people or something else.`,
    },
  ];

  return (
    <section className="mt-16" aria-labelledby="why-deep-dive-heading">
      <p className="text-note font-medium text-accent-700">Step 2 · The Complete Career Report</p>
      <h2 id="why-deep-dive-heading" className="mt-2 text-h2 font-semibold text-text">
        But interests alone aren&apos;t enough
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        The career list ranks careers on what {name} enjoys. That&apos;s a good start — but choosing on interests
        alone can point to the wrong career. The Complete Career Report adds 3 short tests:
      </p>
      <ul className="mt-6 space-y-4">
        {reasons.map((reason) => (
          <li key={reason.title} className="flex gap-4">
            <span aria-hidden="true" className="mt-0.5 text-lead leading-none">
              {reason.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">{reason.title}</p>
              <p className="mt-1 text-body text-text-secondary">{reason.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-body font-medium text-text">
        {name} takes the 3 tests first. Once they&apos;re done, unlock the complete report for {reportPriceLabel}.
      </p>
    </section>
  );
}
