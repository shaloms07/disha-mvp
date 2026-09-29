"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth/client";

/**
 * A tiny "Sign in" / "My wards" link, read from localStorage on mount (auth
 * state can't be known during the server render, so this renders nothing
 * until then - see lib/auth/client.ts).
 */
export function AuthNav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredAuthToken()));
  }, []);

  return (
    <Link href={signedIn ? "/wards" : "/signin"} className="text-note font-medium text-brand-700 hover:underline">
      {signedIn ? "My wards" : "Sign in"}
    </Link>
  );
}
