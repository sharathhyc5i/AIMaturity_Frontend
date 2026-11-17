/**
 * Header dropdown options you want to show but not allow choosing.
 * Disabled options stay in the list, greyed out with a short note, and cannot be selected.
 * Edit the lists, save, and the page updates.
 *
 * Retailer ids:  best-buy · currys · yodobashi · jb-hi-fi · ingram-micro
 * Country codes: US · CA · GB · JP · AU · DE
 */

/** The retailer the header starts on when the link names none (it takes priority over the API's default). */
export const DEFAULT_RETAILER = "best-buy";

/** Retailers that cannot be chosen. */
export const DISABLED_RETAILERS: string[] = ["jb-hi-fi", "ingram-micro", "currys","yodobashi"];

/** Countries that cannot be chosen, for every retailer. */
export const DISABLED_COUNTRIES: string[] = ["CA"];

/** Countries that cannot be chosen for one retailer only, e.g. { 'best-buy': ['CA'] }. */
export const DISABLED_COUNTRIES_BY_RETAILER: Record<string, string[]> = {};

/** Note shown under a disabled option. */
export const DISABLED_NOTE = "Not available yet";

/** Region each country belongs to. The header Region dropdown shows this name instead of the country. */
export const REGION_BY_COUNTRY: Record<string, string> = {
  US: "Americas",
  CA: "Americas",
  GB: "EMEA",
  JP: "Asia",
  AU: "Asia",
};

/** The regions the header Region dropdown offers. */
export const REGIONS: string[] = ["Americas", "EMEA", "Asia"];

export const retailerDisabled = (slug: string) =>
  DISABLED_RETAILERS.includes(slug);
export const countryDisabled = (retailer: string, code: string) =>
  DISABLED_COUNTRIES.includes(code) ||
  (DISABLED_COUNTRIES_BY_RETAILER[retailer] ?? []).includes(code);

/**
 * LOB codes (product families, as the API names them) that cannot be chosen.
 * Surface devices is the only one open, and it is the default.
 */
export const DISABLED_SKUS: string[] = ["copilot-pc", "copilot-pcs", "windows-11", "windows-11-pcs", "m365"];

export const skuDisabled = (code: string) => DISABLED_SKUS.includes(code);