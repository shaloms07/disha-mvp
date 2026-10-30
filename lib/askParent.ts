/**
 * "Ask a parent to unlock" - for a child who finished the test on their own
 * phone. Opens WhatsApp with a message to the registered parent's number (or
 * a contact picker if there isn't a valid one) linking back to this result via
 * /results?t=<token>, where the parent can see it and pay on their own phone.
 * The same token already opens the test via /resume?t=, so it grants nothing
 * new. No WhatsApp Business template is needed - the child sends it.
 */

import { isValidMobile, normalizeMobile } from "@/lib/validation";

export function resultsLinkFor(sessionToken: string, origin: string): string {
  return `${origin}/results?t=${encodeURIComponent(sessionToken)}`;
}

export function askParentWhatsAppUrl({
  parentMobile,
  childName,
  topLabels,
  link,
}: {
  parentMobile?: string;
  childName?: string;
  topLabels: string[];
  link: string;
}): string {
  const lines = [
    `${childName ? `${childName} finished` : "I finished"} the MyLifeCoach career interest test! 🎉`,
    ...(topLabels.length ? [`Strongest interests: ${topLabels.join(" + ")}.`] : []),
    "",
    `See the result and unlock the career matches and stream advice here:`,
    link,
  ];
  const text = lines.join("\n");

  const phone = parentMobile && isValidMobile(parentMobile) ? `91${normalizeMobile(parentMobile)}` : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
