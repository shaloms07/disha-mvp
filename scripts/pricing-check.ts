/**
 * Upgrade-price checks - run with `npm run pricing` (also part of
 * `npm run checks`). A ₹99 buyer who upgrades to the Complete Career Report
 * pays ₹899, never ₹998 again - enforced where the Razorpay order is created
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
const list998 = totalForLevel(3);
const list1998 = totalForLevel(4);
check("prices: ₹99 / ₹998 / ₹1,998", list99 === 99 && list998 === 998 && list1998 === 1998, `${list99}/${list998}/${list1998}`);
check("₹99 paid -> Complete Career Report costs ₹899", priceAfterCredit(3, 99) === 899, String(priceAfterCredit(3, 99)));
check("₹99 paid -> Report + Counsellor costs ₹1,899", priceAfterCredit(4, 99) === 1899, String(priceAfterCredit(4, 99)));
check("nothing paid -> full ₹998", priceAfterCredit(3, 0) === 998);
check("₹998 paid -> counsellor add-on costs ₹1,000", priceAfterCredit(4, 998) === PRICING.consultationAddOn);
check("never negative", priceAfterCredit(1, 998) === 0);

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
