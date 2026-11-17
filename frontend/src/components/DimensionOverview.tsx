import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown16Regular, DocumentTable20Regular } from "@fluentui/react-icons";
import { useMeta, useScoped, type DimCode, type Info, type QRow } from "../lib/api";
import { downloadQuestionsExcel } from "../lib/exportReport";
import { DimensionCards, type OutcomeDim } from "./DimensionCards";
import { useToast } from "./feedback";
import { Query } from "./Query";
import { QuestionTree } from "./QuestionTree";
import { RatingsKey } from "./RatingsKey";
import { Panel, StackBar } from "./ui";
import { withSampleScore } from "../lib/sample";
import { dryRunQuestions, dryRunSources, hasDryRun } from "../lib/dryRun";
import { DIM_COLOR } from "../lib/constants";

interface Data {
  info: Info;
  dimensions: OutcomeDim[];
  questions: QRow[];
}

/** A question's 0-1 score as a rating: 0.70 and above Good, 0.40 to 0.69 Okay, below 0.40 Needs Optimization. */
export const bandOf = (score: number) => (score >= 0.7 ? "Yes" : score >= 0.4 ? "Partial" : "Issue");

/** A question's rating key for the bars: from its score, or its status (e.g. N/A) when it has none. */
const keyOf = (q: QRow) => (q.score != null ? bandOf(q.score) : q.status);

/** Questions counted by rating; questions without a score count under their status (e.g. Not applicable). */
export function countsOf(questions: QRow[]) {
  const c: Record<string, number> = {};
  for (const q of questions) c[keyOf(q)] = (c[keyOf(q)] ?? 0) + 1;
  return c;
}

/** Each sub-theme's questions counted by rating. Questions with no listed sub-theme go under "Other". */
export function themesOf(dimension: DimCode, questions: QRow[], themes: OutcomeDim["themes"]) {
  const names = new Set(themes.map((t) => t.name));
  const inDim = questions.filter((q) => q.dimension === dimension);
  const groups = themes.map((t) => ({ name: t.name, rows: inDim.filter((q) => q.sub_theme === t.name) }));
  const other = inDim.filter((q) => !names.has(q.sub_theme));
  if (other.length) groups.push({ name: "Other", rows: other });
  return groups
    .filter((g) => g.rows.length)
    .map((g) => ({ name: g.name, total: g.rows.length, status: countsOf(g.rows) }))
    .sort((a, b) => b.total - a.total);
}

/** A fixed-height box that scrolls vertically; "View more" shows while there is more below and scrolls to it. */
export function ScrollBox({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = box.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };
  useEffect(() => {
    check();
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="scrollbox">
      <div className="scrollbox__body" ref={box} onScroll={check} tabIndex={0}>
        {children}
      </div>
      {more && (
        <button
          type="button"
          className="scrollbox__more"
          onClick={() => {
            const el = box.current;
            if (el) el.scrollTop += el.clientHeight * 0.8;
            check();
          }}
        >
          View more
          <ChevronDown16Regular aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** The overall scoring: every question given counted by its rating, from the stored scores. */
export function OverallSummary({
  questions,
  title = "All questions",
  top = false,
}: {
  questions: QRow[];
  title?: string;
  /** Shown at the top of the panel, above the cards, instead of at the bottom */
  top?: boolean;
}) {
  const summary = countsOf(questions);
  return (
    <div className={`dimpanel__overall ${top ? "dimpanel__overall--top" : ""}`}>
      <span className="dimpanel__h">{title}</span>
      <StackBar counts={summary} height={12} showLegend showAll />
    </div>
  );
}

/** Under the ratings on Account assessment. With no dimension selected it shows the dimension scores,
 *  the overall scoring and every question; with one selected it shows that dimension's sub-themes,
 *  its questions and its scorecard. The questions can be filtered by dimension. */
export function DimensionOverview({
  selected,
  onSelect,
}: {
  /** A dimension, or "all" for the overall breakdown (the AI Maturity Score card) */
  selected: DimCode | "all" | null;
  onSelect: (code: DimCode) => void;
}) {
  const q = useScoped<Data>("/api/outcomes");
  const { data: meta } = useMeta();
  const name = (c: DimCode) =>
    meta?.dimensions.find((x) => x.code === c)?.name ?? c;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Download every question as an Excel workbook
  const exportExcel = async (rows: QRow[], info: Info) => {
    setBusy(true);
    try {
      const file = `${info.retailer.name}_${info.market.code}_${info.period}_questions`.replace(
        /[^A-Za-z0-9_-]+/g,
        "-",
      );
      const slug = info.retailer.slug;
      await downloadQuestionsExcel(
        rows,
        info,
        (c) => name(c as DimCode),
        file,
        hasDryRun(slug) ? (qid) => dryRunSources(slug, qid) : undefined,
      );
    } catch (e) {
      toast("error", `The Excel file could not be built: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Query q={q}>
      {(d) => {
        const sel = d.dimensions.find((x) => x.dimension === selected) ?? null;
        // Best Buy and Amazon use the dry-run questions, answers and scores; otherwise each question's
        // status follows its rating from the stored score
        const slug = d.info.retailer.slug;
        const rated = hasDryRun(slug)
          ? dryRunQuestions(slug, d.questions)
          : d.questions.map((q) =>
              q.score == null ? q : { ...q, status: bandOf(q.score) as QRow["status"] },
            );
        const scored = d.dimensions.map((x) => ({
          ...x,
          score: withSampleScore(slug)(x.score),
        }));
        // A dimension's bar counts its questions by rating
        const statusOf = (dim: DimCode) => countsOf(rated.filter((q) => q.dimension === dim));
        // Level results and questions in one table: dimension, then level, then its questions
        const questions = (
          <Panel
            className="aa-row"
            title="Questions"
            sub="Every question by dimension and level. Open a question for its lens, finding and sources."
          >
            <QuestionTree
              dimensions={scored.map((x) => ({
                code: x.dimension,
                name: name(x.dimension),
                score: x.score,
              }))}
              questions={rated}
              retailer={slug}
              actions={
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busy || rated.length === 0}
                  onClick={() => exportExcel(rated, d.info)}
                >
                  <DocumentTable20Regular />
                  {busy ? "Preparing…" : "Download Excel"}
                </button>
              }
            />
          </Panel>
        );
        // The AI Maturity Score card: every dimension's sub-themes and every question's rating, in one panel
        if (selected === "all")
          return (
            <>
              <Panel
                title="All dimensions by sub-theme"
                sub="Status of every question in each sub-theme, across all four dimensions and all lenses."
                className="aa-row dimpanel"
              >
                <RatingsKey />
                <ScrollBox key="all">
                  <ul className="themes">
                    {d.dimensions.flatMap((x) =>
                      themesOf(x.dimension, rated, x.themes).map((t) => (
                        <li key={`${x.dimension}|${t.name}`}>
                          <span className="themes__name">
                            <span>
                              <b className="themes__dim" style={{ color: DIM_COLOR[x.dimension] }}>
                                {x.dimension}
                              </b>{" "}
                              {t.name}
                            </span>
                            <small>{t.total}</small>
                          </span>
                          <StackBar counts={t.status} height={8} />
                        </li>
                      )),
                    )}
                  </ul>
                </ScrollBox>
                <OverallSummary questions={rated} />
              </Panel>
              {questions}
            </>
          );
        if (!sel)
          return (
            <>
              {/* The overall rating bar, dimension scores and the ratings key in one panel */}
              <Panel
                className="aa-row dimpanel"
                title="Scores by dimension"
                sub="Each dimension's level and evidence status. Select one for its sub-themes."
              >
                <OverallSummary questions={rated} top />
                <DimensionCards
                  dimensions={scored.map((x) => ({
                    ...x,
                    status: statusOf(x.dimension),
                  }))}
                  name={name}
                  active={null}
                  onSelect={onSelect}
                />
                <RatingsKey className="ckey--bottom" />
              </Panel>
              {questions}
            </>
          );
        return (
          <>
            {/* Ratings key, the dimension's sub-themes and its rating bar in one panel */}
            <Panel
              title={`${sel.dimension} by sub-theme`}
              sub="Status of every question in each sub-theme, all lenses."
              className="aa-row dimpanel"
            >
              <RatingsKey />
              <ScrollBox key={sel.dimension}>
                <ul className="themes">
                  {themesOf(sel.dimension, rated, sel.themes).map((t) => (
                      <li key={t.name}>
                        <span className="themes__name">
                          {t.name}
                          <small>{t.total}</small>
                        </span>
                        <StackBar counts={t.status} height={8} />
                      </li>
                    ))}
                </ul>
              </ScrollBox>
              <OverallSummary
                title={`All ${sel.dimension} questions`}
                questions={rated.filter((q) => q.dimension === sel.dimension)}
              />
            </Panel>
            {questions}
          </>
        );
      }}
    </Query>
  );
}
