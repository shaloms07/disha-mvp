/**
 * Mock slots for the tier-3 1:1 consultation add-on (SelectedTiers.consultation).
 *
 * PRD.md originally scoped this as a "coming soon" placeholder with no real
 * Calendly/Cal.com integration. This still has no real calendar behind it —
 * there's no counsellor availability anywhere — but it now lets a parent
 * actually pick a slot and get a mock confirmation, generated relative to
 * today so the demo never shows a stale date.
 */

export interface ConsultationSlot {
  id: string;
  label: string;
}

const TIMES = ["11:00 AM", "4:00 PM", "6:30 PM"];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** The next four weekdays (skipping today and weekends), one time slot each */
export function getConsultationSlots(now: Date = new Date()): ConsultationSlot[] {
  const slots: ConsultationSlot[] = [];
  let cursor = addDays(now, 1);

  while (slots.length < 4) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      const time = TIMES[slots.length % TIMES.length];
      slots.push({
        id: cursor.toISOString().slice(0, 10),
        label: `${formatDay(cursor)}, ${time} IST`,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return slots;
}
