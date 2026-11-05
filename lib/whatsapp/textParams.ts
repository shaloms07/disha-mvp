/**
 * Shared across every WhatsApp template sender (lib/whatsapp/messages.ts,
 * lib/whatsapp/journeyMessages.ts) - Meta rejects the whole message on an
 * empty parameter, a newline/tab, or 4+ spaces in a row, so every piece of
 * free-text user input (parent/child names) is cleaned before it ever
 * reaches a template parameter.
 */
export function sanitizeText(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
}

export function displayName(name: string): string {
  return sanitizeText(name) || "there";
}

export function displayChildName(name: string): string {
  return sanitizeText(name) || "your child";
}
