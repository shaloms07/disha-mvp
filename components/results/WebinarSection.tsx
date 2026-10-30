import { WEBINAR } from "@/lib/resultsPageConfig";

/**
 * "Not ready to decide?" - the long route, placed after the offer so it
 * doesn't compete with it. Off for now: shown only when SHOW_WEBINAR_SECTION
 * is on in lib/resultsPageConfig.ts.
 */
export function WebinarSection() {
  return (
    <section className="mt-16 rounded-2xl bg-brand-800 p-7 text-white shadow-feature sm:p-9">
      <h2 className="text-h3 font-semibold text-white">Not ready to decide?</h2>
      <p className="mt-2 text-body text-brand-100">
        Join our free live webinar for parents — how to choose the right stream, with live Q&amp;A.
      </p>
      {WEBINAR.nextSession && <p className="mt-4 font-semibold text-white">{WEBINAR.nextSession}</p>}
      {WEBINAR.registerUrl && (
        <a
          href={WEBINAR.registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-lg bg-accent-400 px-5 font-medium text-ink-deep hover:bg-accent-300"
        >
          Save my seat
        </a>
      )}
      {WEBINAR.recordingUrl && (
        <p className="mt-4 text-center text-note text-brand-100">
          or{" "}
          <a href={WEBINAR.recordingUrl} target="_blank" rel="noopener noreferrer" className="underline">
            watch last week&apos;s recording now
          </a>
        </p>
      )}
    </section>
  );
}
