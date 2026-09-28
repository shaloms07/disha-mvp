"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";

/** Renders nothing — captures ad UTM params (lib/utm.ts) on first paint, once per tab. */
export function UtmCapture() {
  useEffect(() => {
    captureUtmParams(window.location.search);
  }, []);

  return null;
}
