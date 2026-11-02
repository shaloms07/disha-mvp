/**
 * One-off: registers our webhook with Calendly (invitee.created,
 * invitee.canceled) so booking a counsellor call reaches
 * server/routes/calendlyWebhook.ts. Run once per environment, after deploying
 * with CALENDLY_API_TOKEN and CALENDLY_WEBHOOK_SIGNING_KEY set.
 *
 *   npm run calendly:subscribe
 */

import "dotenv/config";

const API_BASE = "https://api.calendly.com";

async function calendlyFetch(path: string, init?: RequestInit) {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new Error("CALENDLY_API_TOKEN is not set");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Calendly API ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) throw new Error("CALENDLY_WEBHOOK_SIGNING_KEY is not set");

  const webhookUrl = process.env.CALENDLY_WEBHOOK_URL ?? "https://api.mylifecoach.in/webhooks/calendly";

  const me = await calendlyFetch("/users/me");
  const userUri: string = me.resource.uri;
  const organizationUri: string = me.resource.current_organization;

  const existing = await calendlyFetch(
    `/webhook_subscriptions?organization=${encodeURIComponent(organizationUri)}&scope=user&user=${encodeURIComponent(userUri)}`,
  );
  const already = existing.collection?.find((sub: { callback_url?: string }) => sub.callback_url === webhookUrl);
  if (already) {
    console.log("A webhook subscription already points at this URL:");
    console.log(JSON.stringify(already, null, 2));
    return;
  }

  const created = await calendlyFetch("/webhook_subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      events: ["invitee.created", "invitee.canceled"],
      organization: organizationUri,
      user: userUri,
      scope: "user",
      signing_key: signingKey,
    }),
  });
  console.log("Created webhook subscription:");
  console.log(JSON.stringify(created, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
