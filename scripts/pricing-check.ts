/**
 * Upgrade-price checks - run with `npm run pricing` (also part of
 * `npm run checks`). A ₹49 buyer who upgrades to the Complete Career Report
 * pays ₹449, never ₹498 again - enforced where the Razorpay order is created
 * (server/routes/checkout.ts), which charges priceAfterCredit(level, paid)
 * with `paid` read from the database, never from the browser.
 */

import { readFileSync } from "node:fs";
import {
  BUNDLE_OFFER_PRICE,
  BUNDLE_REGULAR_PRICE,
  PRICING,
  launchPriceActive,
  offerActive,
  priceAfterCredit,
  totalForLevel,
} from "../lib/pricing";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

// Either side of the launch offer's end (2026-11-25 23:59:59 IST)
const DURING = new Date("2026-11-25T23:59:00+05:30");
const AFTER = new Date("2026-11-26T00:00:01+05:30");

const list = totalForLevel(1, AFTER);
const report = totalForLevel(3, AFTER);
const bundle = totalForLevel(4, AFTER);
check("prices: ₹49 / ₹498 / ₹1,497", list === 49 && report === 498 && bundle === 1497, `${list}/${report}/${bundle}`);
check("counsellor call add-on is ₹999", PRICING.consultationAddOn === 999 && bundle - report === 999);
check("₹49 paid -> Complete Career Report costs ₹449", priceAfterCredit(3, 49, AFTER) === 449, String(priceAfterCredit(3, 49, AFTER)));
check("₹49 paid -> Report + Counsellor costs ₹1,448 (after the offer)", priceAfterCredit(4, 49, AFTER) === 1448);
check("nothing paid -> full ₹498", priceAfterCredit(3, 0, AFTER) === 498);
check("₹498 paid -> counsellor add-on costs ₹999 (after the offer)", priceAfterCredit(4, 498, AFTER) === PRICING.consultationAddOn);
check("never negative", priceAfterCredit(1, 498) === 0);

// The launch offer: bundle ₹1,299 (normally ₹1,497), ₹49 credited -> ₹1,250
check("offer active until 25 Nov 23:59 IST, not after", offerActive(DURING) && !offerActive(AFTER));
check("bundle ₹1,299 during the offer", totalForLevel(4, DURING) === 1299 && BUNDLE_OFFER_PRICE === 1299);
check("bundle normally ₹1,497", BUNDLE_REGULAR_PRICE === 1497);
check("₹49 paid -> bundle ₹1,250", priceAfterCredit(4, 49, DURING) === 1250, String(priceAfterCredit(4, 49, DURING)));
check("report stays ₹498 during the offer", totalForLevel(3, DURING) === 498);
check("strike-through only during the offer", launchPriceActive(DURING) && !launchPriceActive(AFTER));

// The order route really uses the credited price, with `paid` from the DB.
const route = readFileSync("server/routes/checkout.ts", "utf8");
check(
  "checkout.ts charges priceAfterCredit(level, paid) in paise",
  /const paid = await paidAmount\(session\.id\)/.test(route) &&
    /priceAfterCredit\(option\.level, paid\) \* 100/.test(route),
);
check("checkout.ts never reads an amount from the request body", !/req\.body\.amount|body\.amount/.test(route));

console.log(failures === 0 ? "\nAll pricing checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
