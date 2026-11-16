"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getStoredAuthToken } from "@/lib/auth/client";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const isSignedIn = () => Boolean(getStoredAuthToken());
const isSignedInOnServer = () => false;

/**
 * A tiny "Sign in" / "My wards" link, read from localStorage - an external
 * system, so useSyncExternalStore rather than an effect (no cascading
 * render), and the server snapshot keeps hydration clean since auth state
 * can't be known during the server render - see lib/auth/client.ts.
 */
export function AuthNav() {
  const signedIn = useSyncExternalStore(subscribe, isSignedIn, isSignedInOnServer);

  return (
    <Link href={signedIn ? "/wards" : "/signin"} className="text-note font-medium text-brand-700 hover:underline">
      {signedIn ? "My wards" : "Sign in"}
    </Link>
  );
}
