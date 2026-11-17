/*
 * Dry-run results (6 Nov 2026) for Best Buy and Amazon, from
 * "AI_Maturity_Questions_Dry_Run_Best_buy&Amazon_6-Nov.xlsx": the question set (191 questions) and,
 * per retailer, each question's answer, score (1, 0.5, 0 or N/A) and sources.
 *
 * Scoring: a level's score is the average of its questions' scores; a dimension's score is the
 * average of all its questions' scores × 5; the overall score is the average of D1–D4. Every lens
 * counts; N/A questions are left out.
 *
 * Regenerate data/dryRun.json from a new workbook to update it.
 */
import data from "../data/dryRun.json";
import type { DimCode, QRow, Score } from "./api";
import type { QuestionSources } from "./sampleSources";

interface DryQuestion {
  qid: string;
  dimension: string;
  level: number | null;
  lens: string;
  stage: string;
  text: string;
}
interface DryResult {
  score: number | null;
  answer: string;
  source: string;
}

const QUESTIONS = data.questions as DryQuestion[];
const RESULTS = data.retailers as Record<string, Record<string, DryResult>>;

/** The retailers with dry-run results. */
export const hasDryRun = (retailer: string) => retailer in RESULTS;

/** The questions in the set, in order. */
export const dryRunQuestionCount = QUESTIONS.length;

/** A question's score as a stored status: 1 Yes (Good), 0.5 Partial (Okay), 0 No (Needs Optimization), N/A. */
const statusOf = (score: number | null): QRow["status"] =>
  (score == null ? "N/A" : score >= 1 ? "Yes" : score >= 0.5 ? "Partial" : "No") as QRow["status"];

/**
 * The retailer's questions as table rows: the dry-run text, lens, level, answer (as the finding) and
 * score. Details the workbook does not have (sub-theme, how the agent answers it, cadence…) are taken
 * from `base`, the API's rows, where the Q-ID matches.
 */
export function dryRunQuestions(retailer: string, base: QRow[] = []): QRow[] {
  const res = RESULTS[retailer] ?? {};
  const old = new Map(base.map((q) => [q.qid, q]));
  return QUESTIONS.map((q) => {
    const b = old.get(q.qid);
    const r = res[q.qid];
    return {
      qid: q.qid,
      dimension: q.dimension as DimCode,
      sub_theme: b?.sub_theme ?? "",
      text: q.text,
      lens: q.lens as QRow["lens"],
      level: q.level,
      change: b?.change ?? "",
      evidence_type: b?.evidence_type ?? "",
      how: b?.how ?? "",
      answer_type: b?.answer_type ?? "",
      cadence: b?.cadence ?? "",
      origin: b?.origin ?? null,
      in_run: true,
      status: statusOf(r?.score ?? null),
      finding: r?.answer ?? "",
      sources: [],
      flags: [],
      score: r?.score ?? null,
    };
  });
}

/** A question's sources (URLs, as S1, S2, …) and evidence (capture notes, as EV1, …) from the workbook. */
export function dryRunSources(retailer: string, qid: string): QuestionSources {
  const text = (RESULTS[retailer]?.[qid]?.source ?? "").trim();
  if (!text || text === "—" || text === "-") return { sources: [], evidence: [] };
  const sources: QuestionSources["sources"] = [];
  const rest = text.replace(/https?:\/\/[^\s|"]+(\s*\(([^)]*)\))?/g, (m, _g, note) => {
    sources.push({ url: m.replace(/\s*\([^)]*\)$/, ""), note });
    return "";
  });
  const leftover = rest.replace(/[|"\s]+/g, " ").trim();
  return { sources, evidence: leftover ? [leftover] : [] };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const stageOf = (level: number) => (level >= 4 ? "Run" : level >= 3 ? "Walk" : "Crawl");

export interface DimAverages {
  /** Average of the dimension's scored questions (0–1) */
  average: number | null;
  /** The dimension score: average × 5 (0–5) */
  value: number;
  /** Each level's average (0–1) and how many scored questions it has */
  levels: Record<number, { average: number | null; scored: number; total: number }>;
  scored: number;
  total: number;
}

/** A retailer's averages for one dimension. */
export function dryRunDimension(retailer: string, dimension: string): DimAverages {
  const res = RESULTS[retailer] ?? {};
  const qs = QUESTIONS.filter((q) => q.dimension === dimension);
  const scored = (list: DryQuestion[]) =>
    list.map((q) => res[q.qid]?.score).filter((s): s is number => s != null);
  const levels: DimAverages["levels"] = {};
  for (const L of [1, 2, 3, 4, 5]) {
    const at = qs.filter((q) => q.level === L);
    const s = scored(at);
    levels[L] = { average: avg(s), scored: s.length, total: at.length };
  }
  const all = scored(qs);
  const a = avg(all);
  return { average: a, value: a == null ? 0 : a * 5, levels, scored: all.length, total: qs.length };
}

/** A dimension's dry-run score in the app's Score shape (level = whole part, decimals = progress). */
export function dryRunScore(retailer: string, dimension: DimCode, base: Score): Score {
  const d = dryRunDimension(retailer, dimension);
  const v = Math.round(d.value * 100) / 100;
  const level = Math.floor(v);
  return {
    ...base,
    value: v,
    level,
    fraction: v - level,
    stage: level ? stageOf(level) : "Crawl",
    h: false,
    label: v.toFixed(2),
    number: v.toFixed(2),
    key: `L${level}`,
  };
}

/** The reasons behind a dimension's dry-run score: its average, and each level's average. */
export function dryRunWhy(retailer: string, dimension: string): { kind: string; text: string }[] {
  const d = dryRunDimension(retailer, dimension);
  if (d.average == null) return [{ kind: "none", text: "No scored questions in this dimension." }];
  const out = [
    {
      kind: "met",
      text: `Average question score ${Math.round(d.average * 100)}% across ${d.scored} scored questions, × 5 = ${d.value.toFixed(2)}.`,
    },
  ];
  for (const [L, l] of Object.entries(d.levels)) {
    if (!l.total) continue;
    out.push({
      kind: l.average == null ? "ceiling" : l.average >= 0.5 ? "met" : "fail",
      text:
        l.average == null
          ? `Level ${L}: no scored questions (${l.total} N/A).`
          : `Level ${L}: average ${Math.round(l.average * 100)}% over ${l.scored} scored question${l.scored === 1 ? "" : "s"}.`,
    });
  }
  return out;
}
