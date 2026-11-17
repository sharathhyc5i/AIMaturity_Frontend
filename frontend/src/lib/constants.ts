import type { DimCode, Status } from "./api";

export const STATUS_ORDER: Status[] = [
  "Yes",
  "Partial",
  "Issue",
  "No",
  "Not disclosed",
  "Access blocked",
  "Check pending",
  "N/A",
];

/**
 * The retailer rating scale: what every status is called and shown as across the app.
 * The stored statuses (Yes, Partial, …) stay as they are in the workflow and question set;
 * only these names, colours and actions are shown. Change a name here and it changes everywhere.
 */
export type RatingId = "good" | "okay" | "needs" | "blocked" | "pending" | "na";
export interface Rating {
  id: RatingId;
  label: string;
  colorName: string;
  color: string;
  tint: string;
  ink: string;
  meaning: string;
  maps: string;
  scoring: string;
  action: string;
  hatched?: boolean;
  outline?: boolean;
}
export const RATINGS: Rating[] = [
  {
    id: "good",
    label: "Good",
    colorName: "Green",
    color: "#107C10",
    tint: "#E7F4E4",
    ink: "#0B5A0B",
    meaning: "Meets AI-search best practice on the sample; no fix needed",
    maps: "Yes",
    scoring: "1",
    action: "None. Re-check monthly.",
  },
  {
    id: "okay",
    label: "Okay",
    colorName: "Yellow",
    color: "#EAA300",
    tint: "#FFF6D6",
    ink: "#6B4F00",
    meaning: "Meets best practice, with minor gaps or on part of the sample",
    maps: "Partial",
    scoring: "0.5",
    action: "Optional improvement, owned by the agency",
  },
  {
    id: "needs",
    label: "Needs Optimization",
    colorName: "Orange",
    color: "#DA5B0B",
    tint: "#FDEDE3",
    ink: "#8A3707",
    meaning: "Doesn’t meet best practice, or a defect was found",
    maps: "No / Issue / Not disclosed",
    scoring: "0",
    action:
      "Gap goes to the agency for the fix, with an owner and effort estimate",
  },
  {
    id: "blocked",
    label: "Not assessed – access blocked",
    colorName: "Grey, hatched",
    color: "#8A8886",
    tint: "#F1F1F0",
    ink: "#484644",
    hatched: true,
    meaning:
      "We tried but couldn’t measure because the site blocked our crawler",
    maps: "Access blocked (treated like Check pending)",
    scoring: "Left out of the score",
    action: "Allowlisting request to the retailer, then re-run",
  },
  {
    id: "pending",
    label: "Not yet checked",
    colorName: "Grey",
    color: "#BDBDBD",
    tint: "#F5F5F5",
    ink: "#616161",
    meaning: "Check is queued but hasn’t run yet",
    maps: "Check pending",
    scoring: "Left out of the score",
    action: "Run in the next cycle",
  },
  {
    id: "na",
    label: "Not applicable",
    colorName: "No fill",
    color: "#FFFFFF",
    tint: "#FFFFFF",
    ink: "#616161",
    outline: true,
    meaning: "Doesn’t apply to this retailer or market",
    maps: "N/A",
    scoring: "Left out of the score",
    action: "None",
  },
];
export const RATING: Record<RatingId, Rating> = Object.fromEntries(
  RATINGS.map((r) => [r.id, r]),
) as Record<RatingId, Rating>;

/** Stored status → rating. Not disclosed scores 0 and counts, like No, so it is Needs Optimization. */
export const RATING_OF: Record<string, RatingId> = {
  Yes: "good",
  Partial: "okay",
  Issue: "needs",
  No: "needs",
  "Not disclosed": "needs",
  "Access blocked": "blocked",
  "Check pending": "pending",
  "N/A": "na",
  "Not in run": "na",
};
export const ratingOf = (status: string): Rating =>
  RATING[RATING_OF[status] ?? "na"];

/** What a stored status adds beyond its rating (shown as a tooltip and in detail views). */
const STATUS_NOTE: Record<string, string> = {
  Issue: "A defect was found on the sampled pages.",
  No: "Checked: the public information does not meet the test.",
  "Not disclosed":
    "Not published either way in any public source reviewed; scored like No.",
};

/** Colours and hover text for each stored status, from its rating. */
export const STATUS_META: Record<
  string,
  { color: string; tint: string; ink: string; hint: string; label: string }
> = Object.fromEntries(
  [...STATUS_ORDER, "Not in run"].map((s) => {
    const r = ratingOf(s);
    return [
      s,
      {
        color: r.color,
        tint: r.tint,
        ink: r.ink,
        label: r.label,
        hint: STATUS_NOTE[s] ? `${r.meaning}. ${STATUS_NOTE[s]}` : r.meaning,
      },
    ];
  }),
);

/** Dimension colours: this palette for D1–D4; other dimensions (Settings can add them) take their colour
 *  from the API, and unknown codes fall back to grey. */
const FALLBACK = "#605E5C";
const PALETTE: Record<string, string> = {
  D1: "#68C0A9",
  D2: "#3586AB",
  D3: "#8374B5",
  D4: "#C864A6",
};
const colors: Record<string, string> = { ...PALETTE };
const tint = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.9);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
};
export const DIM_COLOR: Record<DimCode, string> = new Proxy(colors, {
  get: (t, k: string) => t[k] ?? FALLBACK,
});
export const DIM_TINT: Record<DimCode, string> = new Proxy(
  {},
  { get: (_t, k: string) => tint(colors[k] ?? FALLBACK) },
);
export function registerDimensions(dims: { code: string; color: string }[]) {
  dims.forEach((d) => {
    if (!(d.code in PALETTE) && /^#[0-9a-f]{6}$/i.test(d.color)) colors[d.code] = d.color;
  });
}

export const ROUTE_NAME: Record<number, string> = {
  1: "Customer-facing retailer",
  2: "Distributor or reseller",
  3: "Strategic partner",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const monthShort = MONTHS;
export function fmtPeriod(p: string, long = false) {
  const [y, m] = p.split("-").map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
}
export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Vendor hues: fixed order from the validated categorical palette; colour follows the vendor, never its rank. */
export const VENDOR_COLOR: Record<string, string> = {
  Microsoft: "#2a78d6",
  Apple: "#eb6834",
  HP: "#1baf7a",
  Lenovo: "#eda100",
  Dell: "#e87ba4",
  Samsung: "#6250d6",
};
