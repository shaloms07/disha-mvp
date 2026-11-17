/**
 * Upgrade-price checks - run with `npm run pricing` (also part of
 * `npm run checks`). A ₹99 buyer who upgrades to the Complete Career Report
 * pays ₹900, never ₹999 again - enforced where the Razorpay order is created
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

const list99 = totalForLevel(1);
const list999 = totalForLevel(3);
const list1999 = totalForLevel(4);
check("prices unchanged: ₹99 / ₹999 / ₹1,999", list99 === 99 && list999 === 999 && list1999 === 1999, `${list99}/${list999}/${list1999}`);
check("₹99 paid -> Complete Career Report costs ₹900", priceAfterCredit(3, 99) === 900, String(priceAfterCredit(3, 99)));
check("₹99 paid -> Report + Counsellor costs ₹1,900", priceAfterCredit(4, 99) === 1900, String(priceAfterCredit(4, 99)));
check("nothing paid -> full ₹999", priceAfterCredit(3, 0) === 999);
check("₹999 paid -> counsellor add-on costs ₹1,000", priceAfterCredit(4, 999) === PRICING.consultationAddOn);
check("never negative", priceAfterCredit(1, 999) === 0);

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
