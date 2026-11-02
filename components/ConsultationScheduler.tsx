"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchSessionByToken, type ServerCounsellorCall } from "@/lib/api/realSession";

/** The Calendly event the parent books from (Calendly, "Career counsellor
 *  call", 45 min, Google Meet). Unset, there's no calendar - the team books
 *  calls by hand from the admin page, as before. */
const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "";

const IST = "Asia/Kolkata";

function callWhen(iso: string): string {
  const at = new Date(iso);
  const date = at.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: IST });
  const time = at
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST })
    .toLowerCase();
  return `${date}, ${time}`;
}

/** The parent's number as Calendly's "WhatsApp number" answer - +91 for a
 *  plain 10-digit Indian mobile, anything else as stored. */
function whatsAppAnswer(mobile?: string): string {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return digits.length === 10 ? `+91 ${digits}` : (mobile ?? "");
}

/**
 * The tier-4 1:1 consultation, shown once the full report is ready (on
 * /results and /report-preview). Booking is Calendly's inline calendar,
 * prefilled with the parent's name, WhatsApp number and child's name, and
 * tagged with the session token (utm_content) so the server's Calendly
 * webhook can tie the booking to this session, record the call and send
 * counsellor_confirmed. Once the server has a call on record, that's shown
 * instead of the calendar.
 */
export function ConsultationScheduler({
  sessionToken,
  parentName,
  parentMobile,
  childName,
}: {
  sessionToken?: string;
  parentName?: string;
  parentMobile?: string;
  childName?: string;
}) {
  const [call, setCall] = useState<ServerCounsellorCall | null>(null);
  const [justBooked, setJustBooked] = useState(false);
  const [height, setHeight] = useState(720);

  // A call booked earlier, possibly on another phone
  useEffect(() => {
    if (!sessionToken) return;
    fetchSessionByToken(sessionToken)
      .then((server) => setCall(server?.counsellorCall ?? null))
      .catch(() => {});
  }, [sessionToken]);

  const calendar = useMemo(() => {
    if (!CALENDLY_URL || !sessionToken || typeof window === "undefined") return null;
    const url = new URL(CALENDLY_URL);
    url.searchParams.set("embed_domain", window.location.host);
    url.searchParams.set("embed_type", "Inline");
    url.searchParams.set("hide_gdpr_banner", "1");
    url.searchParams.set("hide_event_type_details", "1");
    if (parentName) url.searchParams.set("name", parentName);
    if (parentMobile) url.searchParams.set("a1", whatsAppAnswer(parentMobile));
    if (childName) url.searchParams.set("a2", childName);
    url.searchParams.set("utm_source", "mylifecoach");
    url.searchParams.set("utm_medium", "website");
    url.searchParams.set("utm_content", sessionToken);
    return { src: url.toString(), origin: url.origin };
  }, [sessionToken, parentName, parentMobile, childName]);

  // Calendly's iframe reports its height and a finished booking by postMessage
  useEffect(() => {
    if (!calendar) return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== calendar!.origin || typeof e.data?.event !== "string") return;
      if (e.data.event === "calendly.page_height") {
        const px = parseInt(String(e.data.payload?.height), 10);
        if (px > 0) setHeight(px);
      } else if (e.data.event === "calendly.event_scheduled") {
        setJustBooked(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [calendar]);

  const name = childName ? `${childName}'s` : "the";

  if (call) {
    return (
      <Card tone="feature" id="book" className="mt-16 scroll-mt-6">
        <p className="text-note text-brand-100/75">Counsellor call booked</p>
        <h2 className="mt-3 text-h2 font-semibold text-white">{callWhen(call.scheduledAt)}</h2>
        <p className="mt-4 text-body text-brand-100">
          A 45-minute video call with our career counsellor about {name} report. We&apos;ll remind you on
          WhatsApp before it starts.
        </p>
        {call.meetingLink && (
          <a
            href={call.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent-600 px-6 text-body font-semibold text-white hover:bg-accent-700"
          >
            Join link
          </a>
        )}
        {call.rescheduleUrl && (
          <p className="mt-5 text-note text-brand-100/75">
            Need another time?{" "}
            <a href={call.rescheduleUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Reschedule
            </a>
          </p>
        )}
      </Card>
    );
  }

  if (!calendar) {
    return (
      <Card tone="feature" id="book" className="mt-16 scroll-mt-6">
        <h2 className="text-h2 font-semibold text-white">Your 1:1 consultation is included</h2>
        <p className="mt-4 text-body text-brand-100">
          Our team will call within 24 hours to schedule a 45-minute call with a career counsellor to go over{" "}
          {name} result at a time that works for you.
        </p>
      </Card>
    );
  }

  return (
    <section id="book" className="mt-16 scroll-mt-6">
      <h2 className="text-h2 font-semibold text-text">
        {justBooked ? "Your call is booked" : "Book your counsellor call"}
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        {justBooked
          ? "The time and the video-call link are on their way to you on WhatsApp and email."
          : `Pick a time for a 45-minute video call with our career counsellor about ${name} report. Included in your plan.`}
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        <iframe
          src={calendar.src}
          title="Book a counsellor call"
          className="block w-full"
          style={{ height }}
        />
      </div>
    </section>
  );
}
