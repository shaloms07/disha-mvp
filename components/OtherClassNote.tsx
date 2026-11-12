import { SUPPORT_EMAIL } from "@/lib/support";
import { OTHER_CLASS_MESSAGE } from "@/lib/validation";

/** Picking "Other" on /register or /resume: no session is created - the
 *  test is built for Classes 8-12 - just a way to reach the team. */
export function OtherClassNote() {
  return (
    <div role="status" className="mt-6 rounded-lg border border-hairline bg-surface-sunk/60 px-4 py-3">
      <p className="text-body text-text">{OTHER_CLASS_MESSAGE}</p>
      <p className="mt-1 text-note text-text-secondary">
        Questions? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
