/**
 * The Meta ads we run, by ad ID - for /admin's Source column.
 *
 * The ads' URL parameters send utm_content={{ad.name}}-{{ad.id}}, but Meta
 * fills {{ad.name}} with the name the ad had at the moment of the click, and
 * two ads can share a name ("New Leads ad"). The ID never changes, so a
 * registration is labelled by looking its ad ID up here - the ad's current
 * name and its ad set. An ID missing from this list falls back to the name
 * the link carried.
 *
 * Add a line for every new ad: Ads Manager -> Ads tab -> the "Ad ID" column.
 */
export const META_ADS: Record<string, { name: string; adSet: string }> = {
  "120250200116010677": { name: "All 18+ | Metro | FB+IG", adSet: "All 18+ | Metro | FB+IG" },
  // TODO: the "New Leads ad" in "Parents 32-55 | Metro | HHI | FB+IG" - its ad ID
};

/** "New Leads ad-120250200116010677" -> { name: "New Leads ad", id: "120250200116010677" } */
export function splitAdContent(utmContent?: string | null): { name?: string; id?: string } {
  const value = utmContent?.trim();
  if (!value) return {};
  const match = value.match(/^(.*?)\s*[-_]\s*(\d{8,})$/);
  if (!match) return { name: value };
  return { name: match[1].trim() || undefined, id: match[2] };
}

/**
 * What to call the ad a registration came from: the ad set and the ad's
 * current name when the ad ID is in META_ADS, otherwise the ad set from the
 * link (utm_term) and the ad name the link carried. One name when both are
 * the same.
 */
export function describeAd(utmContent?: string | null, utmTerm?: string | null): {
  adSet?: string;
  ad?: string;
  id?: string;
  label?: string;
} {
  const { name, id } = splitAdContent(utmContent);
  const known = id ? META_ADS[id] : undefined;
  const adSet = known?.adSet ?? (utmTerm?.trim() || undefined);
  const ad = known?.name ?? name;
  const parts = [adSet, ad].filter((part): part is string => Boolean(part));
  const label = [...new Set(parts)].join(" · ") || undefined;
  return { adSet, ad, id, label };
}
