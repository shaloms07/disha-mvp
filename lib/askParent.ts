/**
 * "Ask a parent to unlock" - for a child who finished the test on their own
 * phone. Opens WhatsApp with a message to the registered parent's number (or
 * a contact picker if there isn't a valid one) linking back to this result via
 * /results?t=<token>, where the parent can see it and pay on their own phone.
 * The same token already opens the test via /resume?t=, so it grants nothing
 * new. No WhatsApp Business template is needed - the child sends it.
 */

import { isValidMobile, normalizeMobile } from "@/lib/validation";

/** `pay` adds &pay=1: the results page then scrolls to the ₹999 card and
 *  highlights the Unlock button (it never opens checkout by itself). */
export function resultsLinkFor(sessionToken: string, origin: string, options: { pay?: boolean } = {}): string {
  return `${origin}/results?t=${encodeURIComponent(sessionToken)}${options.pay ? "&pay=1" : ""}`;
}

export function askParentWhatsAppUrl({
  parentMobile,
  childName,
  topLabels,
  link,
  priceLabel,
}: {
  parentMobile?: string;
  childName?: string;
  topLabels: string[];
  link: string;
  /** e.g. "₹999" - what unlocking the full plan costs, said up front */
  priceLabel?: string;
}): string {
  const who = childName || "I";
  const lines = [
    `${who} finished the MyLifeCoach career tests! 🎉`,
    ...(topLabels.length ? [`Strongest interests: ${topLabels.join(" + ")}.`] : []),
    "",
    priceLabel
      ? `${childName ? `${childName}'s` : "My"} full career plan is ready. See the results and unlock it here (${priceLabel}, one-time):`
      : `See the results here:`,
    link,
  ];
  const text = lines.join("\n");

  const phone = parentMobile && isValidMobile(parentMobile) ? `91${normalizeMobile(parentMobile)}` : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
