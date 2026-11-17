import type { Score } from "./api";
import { dryRunDimension, dryRunScore, dryRunWhy, hasDryRun } from "./dryRun";

/* Dimension scores for the retailers with dry-run results (Best Buy and Amazon): each dimension's
 * average question score × 5, from lib/dryRun.ts. Shown wherever a dimension score appears. Other
 * retailers keep the API's score. */

/** The month the dry-run scores stand for; the month-on-month chart enables only this month. */
export const SAMPLE_PERIOD = "2026-11";

/** True when a retailer has dry-run scores. */
export const hasSample = (retailer: string) => hasDryRun(retailer);

/** Scores show as plain numbers (3.25), without the level prefix from the API. */
export const plainScore = (text: string) => text.replace(/^L(?=\d)/, "");

const valueOf = (retailer: string, dimension: string) =>
  Math.round(dryRunDimension(retailer, dimension).value * 100) / 100;

/** The label for a dimension's score, with the dry-run score applied where there is one. */
export const sampleLabel = (retailer: string, dimension: string, label: string) => {
  if (!hasDryRun(retailer)) return label === "Not established" ? "—" : plainScore(label);
  return valueOf(retailer, dimension).toFixed(2);
};

/** A dimension's score value, with the dry-run score applied where there is one. */
export const sampleValue = (retailer: string, dimension: string, value: number) =>
  hasDryRun(retailer) ? valueOf(retailer, dimension) : value;

/** The reasons behind a dimension's score: from the dry-run averages where there are some, so they
 *  match the score shown. Otherwise the API's reasons are kept. */
export function sampleWhy(
  retailer: string,
  dimension: string,
  why: { kind: string; text: string }[],
): { kind: string; text: string }[] {
  return hasDryRun(retailer) ? dryRunWhy(retailer, dimension) : why;
}

/** A dimension's score with the retailer's dry-run score applied where there is one. */
export const withSampleScore =
  (retailer: string) =>
  (s: Score): Score =>
    hasDryRun(retailer)
      ? dryRunScore(retailer, s.dimension, s)
      : { ...s, label: plainScore(s.label), number: plainScore(s.number) };
