/**
 * "Invite 3 parents, get the Career Match Report free" - the share link a
 * parent posts to their WhatsApp groups from /results. It's a plain wa.me
 * link with no number, so WhatsApp asks who to send it to; no Business
 * template is needed, since the parent sends it. The link carries only the
 * session's invite code, never its token or the child's result.
 */

export const INVITES_NEEDED = 3;

export function inviteLinkFor(referralCode: string, origin: string): string {
  return `${origin}/register?ref=${encodeURIComponent(referralCode)}`;
}

export function inviteWhatsAppUrl(link: string): string {
  const text = [
    "Hi everyone! My child just took a free 5-minute career interest test from MyLifeCoach. It shows which kinds of work a child is naturally drawn to, for Classes 8 to 12.",
    "",
    "I found it really useful ahead of the stream decision. You can try it free here:",
    link,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
