"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminTimestamp } from "@/components/admin/AdminTimestamp";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import {
  AdminAuthError,
  fetchAdminInbox,
  markInboxHandled,
  replyInInbox,
  type AdminInbox,
  type AdminInboxConversation,
} from "@/lib/api/admin";
import { formatMobile } from "@/lib/validation";

/**
 * Parents' WhatsApp replies - "can we change the time?" to counsellor_confirmed,
 * questions, STOP - which the Cloud API delivers only to our webhook, so this
 * is the only place they're seen. Above them, the paid parents who need a
 * phone call to book their counsellor session.
 */
export default function AdminInboxPage() {
  const { token, signOut } = useAdminAuth();
  const [data, setData] = useState<AdminInbox>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await fetchAdminInbox(token));
    } catch (err) {
      if (err instanceof AdminAuthError) {
        signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the inbox.");
    } finally {
      setLoading(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const unhandled = data?.conversations.reduce((sum, c) => sum + c.unhandled, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Link href="/admin" className="text-note text-text-secondary hover:text-text">
        ← All registrations
      </Link>
      <div className="mt-4 flex items-center justify-between gap-4">
        <h1 className="text-h1 font-semibold text-text">WhatsApp inbox</h1>
        <Button variant="quiet" size="sm" onClick={() => void load()} loading={loading} loadingText="Refreshing">
          Refresh
        </Button>
      </div>
      <p className="mt-2 text-note text-text-secondary">
        Replies from parents, last 30 days. {unhandled > 0 ? `${unhandled} waiting for an answer.` : "Nothing waiting."}
      </p>

      {error && <p className="mt-6 text-note text-err-700">{error}</p>}

      {data && data.needsCall.length > 0 && (
        <Card className="mt-8 border-accent-700/30">
          <h2 className="text-h3 font-semibold text-text">Call to book their counsellor session</h2>
          <p className="mt-1 text-note text-text-secondary">
            Paid for Report + Counsellor, report ready, no call booked yet.
          </p>
          <ul className="mt-4 divide-y divide-hairline">
            {data.needsCall.map((row) => (
              <li key={row.sessionToken} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                <div>
                  <Link href={`/admin/${row.sessionToken}`} className="font-medium text-text hover:underline">
                    {row.parentName} · {row.childName}
                  </Link>
                  <p className="text-note text-text-secondary">{row.reason}</p>
                </div>
                <div className="text-right text-note">
                  <a href={`tel:+91${row.mobile}`} className="font-mono text-text hover:underline">
                    {formatMobile(row.mobile)}
                  </a>
                  <p className="text-text-muted">
                    Ready since <AdminTimestamp iso={row.readySince} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-8 space-y-5">
        {data?.conversations.map((c) => (
          <Conversation key={c.mobile} conversation={c} token={token} onChanged={load} onAuthError={signOut} />
        ))}
        {data && data.conversations.length === 0 && (
          <p className="text-body text-text-secondary">No replies from parents yet.</p>
        )}
      </div>
    </main>
  );
}

function Conversation({
  conversation: c,
  token,
  onChanged,
  onAuthError,
}: {
  conversation: AdminInboxConversation;
  token: string;
  onChanged: () => Promise<void>;
  onAuthError: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      setReply("");
      await onChanged();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          {c.sessionToken ? (
            <Link href={`/admin/${c.sessionToken}`} className="font-medium text-text hover:underline">
              {c.parentName ?? "Unknown"}
              {c.childName ? ` · ${c.childName}` : ""}
            </Link>
          ) : (
            <span className="font-medium text-text">Not a registered parent</span>
          )}
          <p className="font-mono text-note text-text-secondary">{formatMobile(c.mobile)}</p>
        </div>
        {c.unhandled > 0 ? (
          <AdminBadge tone="warn">{`${c.unhandled} waiting`}</AdminBadge>
        ) : (
          <AdminBadge tone="muted">Done</AdminBadge>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {c.messages.map((m) => (
          <li key={m.id} className={m.direction === "OUT" ? "flex justify-end" : "flex"}>
            <div
              className={
                m.direction === "OUT"
                  ? "max-w-[85%] rounded-lg bg-brand-800 px-3 py-2 text-note text-white"
                  : "max-w-[85%] rounded-lg bg-surface-sunk px-3 py-2 text-note text-text"
              }
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={m.direction === "OUT" ? "mt-1 text-brand-100/75" : "mt-1 text-text-muted"}>
                <AdminTimestamp iso={m.createdAt} />
              </p>
            </div>
          </li>
        ))}
      </ul>

      {c.canReply ? (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => replyInInbox(token, c.mobile, reply));
          }}
        >
          <label htmlFor={`reply-${c.mobile}`} className="sr-only">
            Reply
          </label>
          <textarea
            id={`reply-${c.mobile}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Type a reply - it goes to the parent on WhatsApp"
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-body text-text"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={busy} loadingText="Sending" disabled={!reply.trim()}>
              Send reply
            </Button>
            {c.unhandled > 0 && (
              <Button type="button" variant="quiet" size="sm" disabled={busy} onClick={() => void run(() => markInboxHandled(token, c.mobile))}>
                Mark done
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-note text-text-secondary">
          <span>
            Over 24 hours since their last message, so WhatsApp won&apos;t deliver a typed reply.{" "}
            <a href={`tel:+91${c.mobile}`} className="text-text underline">
              Call them
            </a>
            .
          </span>
          {c.unhandled > 0 && (
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => void run(() => markInboxHandled(token, c.mobile))}>
              Mark done
            </Button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-note text-err-700">{error}</p>}
    </Card>
  );
}
