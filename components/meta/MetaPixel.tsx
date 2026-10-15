"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CookieConsentBanner, getStoredConsent, type ConsentState } from "./CookieConsentBanner";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Mounted once in app/layout.tsx. Loads Meta's Pixel script only after the
 * consent banner is accepted (fail-closed - nothing loads on "Decline" or on
 * a first visit that hasn't answered yet), and manually re-fires PageView on
 * every client-side route change, since the Pixel's own automatic PageView
 * (fired once from its init script) never sees the App Router's SPA-style
 * navigations.
 */
export function MetaPixel() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setConsent(getStoredConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (consent !== "granted") return;
    (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "PageView");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, consent]);

  if (!hydrated || !PIXEL_ID) return null;

  return (
    <>
      {!consent && <CookieConsentBanner onDecision={setConsent} />}
      {consent === "granted" && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
