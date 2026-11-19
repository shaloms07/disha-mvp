import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "@/lib/support";

/** "Questions? Call +91 …" under the payment buttons - a tap on a phone
 *  starts the call (lib/support.ts). */
export function SupportCallLine({ className = "mt-2" }: { className?: string }) {
  return (
    <p className={`${className} text-note text-text-secondary`}>
      Questions before paying? Call{" "}
      <a
        href={SUPPORT_PHONE_HREF}
        className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
      >
        {SUPPORT_PHONE_DISPLAY}
      </a>
    </p>
  );
}
