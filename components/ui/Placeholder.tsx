import Link from "next/link";

/** Fallback for any route without a built screen. */
export function Placeholder({
  route,
  screen,
  stage,
}: {
  route: string;
  screen: string;
  stage: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-12">
      <p className="font-mono text-note text-text-muted">{route}</p>
      <h1 className="text-h1 font-semibold text-text">{screen}</h1>
      <p className="text-body text-text-secondary">
        Not built yet — scheduled for {stage}.
      </p>
      <Link
        href="/"
        className="inline-flex w-fit items-center rounded-lg border border-control-line bg-surface px-5 py-3 text-body font-medium text-text hover:bg-brand-50"
      >
        Back to start
      </Link>
    </main>
  );
}
