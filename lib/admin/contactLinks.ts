import { normalizeMobile } from "@/lib/validation";

/** /admin's lead list: open a WhatsApp chat with a parent (Indian mobile,
 *  10 digits). Undefined when the number isn't 10 digits. */
export function whatsappChatUrl(parentMobile: string): string | undefined {
  const mobile = normalizeMobile(parentMobile);
  return mobile.length === 10 ? `https://wa.me/91${mobile}` : undefined;
}
