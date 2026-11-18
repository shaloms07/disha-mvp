/**
 * Upgrade-price checks - run with `npm run pricing` (also part of
 * `npm run checks`). A ₹49 buyer who upgrades to the Complete Career Report
 * pays ₹449, never ₹498 again - enforced where the Razorpay order is created
 * (server/routes/checkout.ts), which charges priceAfterCredit(level, paid)
 * with `paid` read from the database, never from the browser.
 */

import { readFileSync } from "node:fs";
import { PRICING, priceAfterCredit, totalForLevel } from "../lib/pricing";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

const list = totalForLevel(1);
const report = totalForLevel(3);
const bundle = totalForLevel(4);
check("prices: ₹49 / ₹498 / ₹1,497", list === 49 && report === 498 && bundle === 1497, `${list}/${report}/${bundle}`);
check("counsellor call add-on is ₹999", PRICING.consultationAddOn === 999 && bundle - report === 999);
check("₹49 paid -> Complete Career Report costs ₹449", priceAfterCredit(3, 49) === 449, String(priceAfterCredit(3, 49)));
check("₹49 paid -> Report + Counsellor costs ₹1,448", priceAfterCredit(4, 49) === 1448, String(priceAfterCredit(4, 49)));
check("nothing paid -> full ₹498", priceAfterCredit(3, 0) === 498);
check("₹498 paid -> counsellor add-on costs ₹999", priceAfterCredit(4, 498) === PRICING.consultationAddOn);
check("never negative", priceAfterCredit(1, 498) === 0);

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
