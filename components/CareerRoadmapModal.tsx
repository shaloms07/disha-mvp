"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { matchPercent } from "@/lib/matching";
import { rankTypes } from "@/lib/scoring";
import { RIASEC_LABELS, type CareerMatch } from "@/types";

/**
 * One career's full detail, lifted out of the report body.
 *
 * Four careers each carrying a full roadmap inline is most of the report's
 * length, and almost none of it is read on the way past — a parent picks one
 * career and wants everything about it. So the cards stay scannable and this
 * holds the depth.
 */
export function CareerRoadmapModal({
  match,
  childName,
  showRoadmap,
  onClose,
}: {
  match: CareerMatch;
  childName?: string;
  /** False when the Roadmap add-on wasn't bought — the detail is withheld, said so */
  showRoadmap: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { career } = match;
  const careerTop = rankTypes(career.profile).slice(0, 2);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby="roadmap-title"
      className="m-auto w-[calc(100vw-2rem)] max-w-xl rounded-2xl border border-hairline bg-surface p-0 text-text shadow-feature backdrop:bg-ink-deep/55"
    >
      <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-surface px-6 py-5 sm:px-8">
        <div>
          <h2
            id="roadmap-title"
            className="text-h3 font-semibold text-text sm:text-h2"
          >
            {career.title}
          </h2>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StarRating stars={match.stars} />
            <span className="font-mono text-note tabular-nums text-text-secondary">
              {matchPercent(match.matchScore)}% match
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="-mr-2 -mt-1 rounded-lg px-2 py-1 text-h3 leading-none text-text-muted hover:bg-surface-sunk hover:text-text"
        >
          <span className="sr-only">Close</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
        <p className="text-body leading-relaxed text-text-secondary">
          {career.description}
        </p>

        <p className="mt-5 border-l-2 border-brand-700 pl-5 text-body text-text">
          <span className="font-medium">Why it fits:</span> this career leans{" "}
          {careerTop.map((t) => RIASEC_LABELS[t]).join(" and ")}, which lines up
          with {childName ? `${childName}'s` : "this profile's"} strongest
          interests.
        </p>

        {career.roadmap && showRoadmap && (
          <div className="mt-8 border-t border-hairline pt-7">
            <h3 className="text-body font-medium text-text">Roadmap</h3>

            <dl className="mt-5 space-y-5 text-body">
              <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-6">
                <dt className="text-text-muted">Entrance exams</dt>
                <dd className="mt-1 text-text sm:mt-0">
                  {career.roadmap.exams.join(", ")}
                </dd>
              </div>
              <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-6">
                <dt className="text-text-muted">Courses and paths</dt>
                <dd className="mt-1 text-text sm:mt-0">
                  {career.roadmap.collegesOrPaths.join(", ")}
                </dd>
              </div>
              <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-6">
                <dt className="text-text-muted">Next steps</dt>
                <dd className="mt-2 sm:mt-0">
                  <ol className="space-y-2.5 text-text">
                    {career.roadmap.steps.map((step, s) => (
                      <li key={step} className="flex gap-3.5">
                        <span
                          aria-hidden="true"
                          className="font-mono text-note text-text-muted"
                        >
                          {s + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            </dl>
          </div>
        )}

        {career.roadmap && !showRoadmap && (
          <p className="mt-8 border-t border-hairline pt-7 text-note text-text-muted">
            Entrance exams, courses and next steps for this career are part of
            the Roadmap add-on. Everything above is included in what you already
            have.
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-hairline px-6 py-4 sm:px-8">
        <Button variant="secondary" onClick={() => ref.current?.close()}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
