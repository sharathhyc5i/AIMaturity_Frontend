import { ChevronRight16Regular } from "@fluentui/react-icons";
import { Fragment, useState, type ReactNode } from "react";
import { useGuide, useMeta, type DimCode, type QRow, type Score } from "../lib/api";
import { DIM_COLOR } from "../lib/constants";
import { dryRunSources, hasDryRun } from "../lib/dryRun";
import { questionSources } from "../lib/sampleSources";
import { Filled, QuestionDetail } from "./QuestionTable";
import { Drawer, StackBar, StatusChip } from "./ui";

interface Cell {
  dimension: string;
  level: number;
  name: string;
  test: string;
}

/** Questions counted by rating (their status), for the small bar on dimension and level rows. */
const countsOf = (qs: QRow[]) => {
  const c: Record<string, number> = {};
  for (const q of qs) c[q.status] = (c[q.status] ?? 0) + 1;
  return c;
};


/** The average score of some questions (N/A left out), or null when none is scored. */
const averageOf = (qs: QRow[]) => {
  const s = qs.map((q) => q.score).filter((x): x is number => x != null);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
};

/** A level's result: its questions' average score, toned like the ratings (Good ≥ 70%, Okay ≥ 40%). */
function resultOf(qs: QRow[]): { text: string; tone: string } {
  if (!qs.length) return { text: "Not tested", tone: "none" };
  const a = averageOf(qs);
  if (a == null) return { text: "N/A", tone: "none" };
  return { text: `${Math.round(a * 100)}% average`, tone: a >= 0.7 ? "met" : a >= 0.4 ? "next" : "low" };
}

/** Every question in one expandable table: dimension, then level (what it tests and its result), then the
 *  level's questions. A question opens in the details pane with its lens, finding and sources. */
export function QuestionTree({
  dimensions,
  questions,
  retailer,
  actions,
}: {
  dimensions: { code: DimCode; name: string; score: Score }[];
  questions: QRow[];
  /** Whose sources and evidence the details pane shows */
  retailer?: string;
  actions?: ReactNode;
}) {
  const { data: fw } = useGuide<{ cells: Cell[] }>("framework");
  const { data: meta } = useMeta();
  // Dimensions start collapsed, including one picked on the cards above
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Levels start collapsed, and only one level is open at a time
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  const [detail, setDetail] = useState<QRow | null>(null);
  // Each question's position in the full list, which picks its sample sources and evidence
  const numOf = new Map(questions.map((q, i) => [q.qid, i]));

  const toggle = (k: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const levelsOf = (dc: DimCode) => {
    const qs = questions.filter((q) => q.dimension === dc);
    const cells = (fw?.cells ?? []).filter((c) => c.dimension === dc);
    const nums = [...new Set([...cells.map((c) => c.level), ...qs.flatMap((q) => (q.level ? [q.level] : []))])].sort();
    const rows = nums.map((L) => ({
      key: `${dc}-L${L}`,
      level: L as number | null,
      cell: cells.find((c) => c.level === L),
      qs: qs.filter((q) => q.level === L),
    }));
    const other = qs.filter((q) => !q.level);
    if (other.length) rows.push({ key: `${dc}-other`, level: null, cell: undefined, qs: other });
    return { qs, rows };
  };
  return (
    <>
      <div className="qtree__bar">{actions}</div>
      <div className="table-wrap">
        <table className="table qtree">
          <thead>
            <tr>
              <th>Dimension · level · question</th>
              <th>What it tests</th>
              <th className="num">Score</th>
              <th>Result</th>
              <th>Questions</th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((d) => {
              const { qs, rows } = levelsOf(d.code);
              const dOpen = open.has(d.code);
              return (
                <Fragment key={d.code}>
                  <tr className="qtree__dim" style={{ ["--dc" as string]: DIM_COLOR[d.code] }}>
                    <td>
                      <button
                        type="button"
                        className="qtree__toggle"
                        aria-expanded={dOpen}
                        onClick={() => toggle(d.code)}
                      >
                        <ChevronRight16Regular className="qtree__chev" aria-hidden="true" />
                        <b className="qtree__code">{d.code}</b>
                        {d.name}
                      </button>
                    </td>
                    {/* What the dimension tests: its definition, as on the dimension cards */}
                    <td className="muted">
                      {meta?.dimensions.find((x) => x.code === d.code)?.summary ?? ""}
                    </td>
                    <td className="num qtree__score">{d.score.value.toFixed(2)}{d.score.h ? " H" : ""}</td>
                    <td />
                    <td>
                      <span className="qtree__count">
                        {qs.length}
                        <StackBar counts={countsOf(qs)} height={6} />
                      </span>
                    </td>
                  </tr>
                  {dOpen &&
                    rows.map((r) => {
                      const lOpen = openLevel === r.key;
                      const res = resultOf(r.qs);
                      return (
                        <Fragment key={r.key}>
                          <tr className="qtree__lvl" style={{ ["--dc" as string]: DIM_COLOR[d.code] }}>
                            <td>
                              <button
                                type="button"
                                className="qtree__toggle"
                                aria-expanded={lOpen}
                                disabled={!r.qs.length}
                                onClick={() => setOpenLevel((o) => (o === r.key ? null : r.key))}
                              >
                                <ChevronRight16Regular className="qtree__chev" aria-hidden="true" />
                                {r.level ? (
                                  <>
                                    <b className="qtree__code">L{r.level}</b>
                                    {r.cell?.name}
                                  </>
                                ) : (
                                  <b>Other questions</b>
                                )}
                              </button>
                            </td>
                            <td className="wrap-sm">{r.level ? r.cell?.test : "Questions not tied to a level"}</td>
                            <td />
                            <td>{res && <span className={`qtree__res is-${res.tone}`}>{res.text}</span>}</td>
                            <td>
                              {r.qs.length ? (
                                <span className="qtree__count">
                                  {r.qs.length}
                                  <StackBar counts={countsOf(r.qs)} height={6} />
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          </tr>
                          {lOpen &&
                            r.qs.map((q) => (
                              <tr
                                key={q.qid}
                                className="qtree__q is-click"
                                tabIndex={0}
                                onClick={() => setDetail(q)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setDetail(q);
                                }}
                              >
                                <td colSpan={2}>
                                  <span className="qtree__qid">{q.qid}</span>
                                  <Filled text={q.text} />
                                </td>
                                <td className="num">{q.score != null ? q.score.toFixed(2) : q.status === "N/A" ? "N/A" : "—"}</td>
                                <td>
                                  <StatusChip status={q.status} size="sm" />
                                </td>
                                <td />
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail && (
            <>
              <span className="qid-inline">{detail.qid}</span>
              <h2 className="drawer__h">
                <Filled text={detail.text} />
              </h2>
            </>
          )
        }
      >
        {detail && (
          <QuestionDetail
            r={detail}
            showStatus
            links={
              retailer && hasDryRun(retailer)
                ? dryRunSources(retailer, detail.qid)
                : questionSources(numOf.get(detail.qid) ?? 0)
            }
          />
        )}
      </Drawer>
    </>
  );
}
