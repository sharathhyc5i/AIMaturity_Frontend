import {
  ChevronDown16Regular,
  Open16Regular,
} from "@fluentui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState, type ReactNode } from "react";
import { getJSON, type Info, type Score } from "../lib/api";
import { DIM_COLOR, DIM_TINT, fmtPeriod } from "../lib/constants";
import { useFilters } from "../lib/filters";
import { GROUP_PILL } from "../pages/overview/SourceRegister";
import { Loading, Modal, StatusChip } from "./ui";

export interface LevelRow {
  level: number;
  name: string;
  stage: string;
  test: string;
  threshold: string;
  requirement: string;
  result: string;
  gate: string;
  pct: number | null;
  yes: number;
  other: number;
  total: number;
  counts: Record<string, number>;
  /** Questions that count toward the percentage (Check pending and N/A are left out) */
  counted?: number;
  /** Weighted points: Yes 1, Partial 0.5, Issue 0.5, No 0, Not disclosed 0 */
  weighted?: number;
  questions: {
    qid: string;
    text: string;
    status: string;
    finding: string;
    sources: string[];
  }[];
}
export interface Detail {
  info: Info;
  dimension: {
    code: string;
    name: string;
    short: string;
    summary: string;
    color: string;
  };
  score: Score;
  threshold: number;
  levels: LevelRow[];
  weights?: Record<string, number>;
  why: {
    kind: "met" | "fail" | "ceiling" | "h" | "none";
    level: number;
    text: string;
  }[];
  facts: {
    score: number;
    label: string;
    stage: string;
    evidence_status: "P" | "V";
    evidence_status_text: string;
    stale: boolean;
    stale_sources: string[];
    basis: string;
    baseline: string | null;
    questions: number;
    answered: number;
  };
  evidence: EvidenceRow[];
  sources: SourceRow[];
}
export interface EvidenceRow {
  id: number;
  eid: string;
  title: string;
  cell: string;
  stage: string;
  confidence: string;
  register_status: string;
  approval: string;
  h_flag: boolean;
  url: string;
  publisher: string;
  claim?: string;
  result?: string;
  /** The questions this record answers and the sources it rests on (older payloads leave these out) */
  questions?: string[];
  sources?: string[];
}
export interface SourceRow {
  code: string;
  title: string;
  publisher: string;
  date: string;
  source_type: string;
  group: string;
  url: string;
  cited_by: string[];
  old: boolean;
}
type QItem = LevelRow["questions"][number];

const GATE_PILL: Record<string, string> = {
  Met: "pill--green",
  "Not met": "pill--red",
  "Not disclosed": "pill--amber",
  Unknown: "",
};

/** Loads the scorecard for one dimension (or one entity of a comparison). */
export function useDimensionDetail(
  code: string | null,
  retailer: string,
  market: string,
  period: string,
  sku: string,
  entity?: { kind: string; name: string },
) {
  return useQuery({
    queryKey: [
      "dimension-detail",
      code,
      retailer,
      market,
      period,
      sku,
      entity?.kind ?? "",
      entity?.name ?? "",
    ],
    queryFn: () =>
      entity
        ? getJSON<Detail>(
            `/api/entity-detail?${new URLSearchParams({ kind: entity.kind, name: entity.name, dimension: code ?? "", retailer, market, period, sku })}`,
          )
        : getJSON<Detail>(
            `/api/dimension-detail?${new URLSearchParams({ dimension: code ?? "", retailer, market, period, sku })}`,
          ),
    enabled: !!code,
  });
}

/** The scorecard for one dimension, shown inline (no pop-up), e.g. under a dimension's sub-themes. */
export function DimensionScorecard({
  code,
  account,
}: {
  code: string;
  /** Show another retailer account than the one picked in the header */
  account?: { retailer: string; market: string };
}) {
  const f = useFilters();
  const retailer = account?.retailer ?? f.retailer;
  const market = account?.market ?? f.market;
  const q = useDimensionDetail(code, retailer, market, f.period, f.sku);
  if (q.isError) return <p className="muted">The scorecard could not be loaded.</p>;
  if (!q.data) return <Loading rows={2} />;
  return <Body d={q.data} />;
}

/** The scorecard for one dimension, as a pop-up of cards. */
export function DimensionModal({
  code,
  onClose,
  account,
  entity,
}: {
  code: string | null;
  onClose: () => void;
  /** Show another retailer account than the one picked in the header */
  account?: { retailer: string; market: string };
  /** Show an entity from a comparison (a retailer, competitor or technology partner) instead of the retailer */
  entity?: { kind: string; name: string };
}) {
  const f = useFilters();
  const { period, sku, meta } = f;
  const retailer = account?.retailer ?? f.retailer;
  const market = account?.market ?? f.market;
  const q = useDimensionDetail(code, retailer, market, period, sku, entity);
  const d = q.data;
  const color = code ? DIM_COLOR[code] : undefined;
  const r = meta?.retailers.find((x) => x.slug === retailer);
  const mk = r?.markets.find((x) => x.code === market);
  return (
    <Modal
      open={!!code}
      onClose={onClose}
      wide
      title={
        <div className="dm-title" style={{ ["--dc" as string]: color }}>
          <span className="dm-title__code">{code}</span>
          <h2>
            {entity ? `${entity.name} · ` : ""}
            {d?.dimension.name ??
              meta?.dimensions.find((x) => x.code === code)?.name ??
              ""}
          </h2>
        </div>
      }
      actions={
        r && (
          <span className="dm-chip">
            {entity ? `${entity.name} · compared in ` : ""}
            {r.name} · {mk?.name ?? market} · {fmtPeriod(period)}
          </span>
        )
      }
    >
      {q.isError ? (
        <p className="muted">The scorecard could not be loaded.</p>
      ) : !d ? (
        <Loading rows={2} />
      ) : (
        <Body d={d} competitor={entity?.name} />
      )}
    </Modal>
  );
}

const STATUS_ORDER = [
  "Yes",
  "Partial",
  "Issue",
  "No",
  "Not disclosed",
  "Access blocked",
  "Check pending",
  "N/A",
];
// Never counted, whatever the weights say
const UNSCORED = ["Check pending", "Access blocked", "N/A"];
const DEFAULT_WEIGHTS: Record<string, number> = {
  Yes: 1,
  Partial: 0.5,
  Issue: 0.5,
  No: 0,
  "Not disclosed": 0,
};
const pts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** How a level's percentage is worked out, in plain words. */
function LevelMath({
  l,
  threshold,
  weights,
}: {
  l: LevelRow;
  threshold: number;
  weights?: Record<string, number>;
}) {
  const W = weights ?? DEFAULT_WEIGHTS;
  const rows = STATUS_ORDER.filter((s) => l.counts[s]).map((s) => ({
    s,
    n: l.counts[s],
    w: UNSCORED.includes(s) ? undefined : W[s],
  }));
  const counted =
    l.counted ?? rows.filter((r) => r.w != null).reduce((a, r) => a + r.n, 0);
  const weighted =
    l.weighted ??
    rows.filter((r) => r.w != null).reduce((a, r) => a + r.n * r.w, 0);
  const left = rows.filter((r) => r.w == null).reduce((a, r) => a + r.n, 0);
  const needPts = Math.max(
    0,
    Math.ceil(((threshold / 100) * counted - weighted) * 2) / 2,
  );
  const met = l.gate === "Met";

  if (!l.total) {
    return (
      <div className="dm-math">
        <p>
          No question in this run tests Level {l.level}, so it is left blank.
        </p>
      </div>
    );
  }
  return (
    <div className="dm-math">
      <p className="dm-math__h">
        How {l.pct != null ? `${l.pct}%` : "this level"} is worked out
      </p>
      <table className="dm-math__t">
        <thead>
          <tr>
            <th>Answer</th>
            <th className="num">Questions</th>
            <th className="num">Points each</th>
            <th className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s} className={r.w == null ? "is-out" : ""}>
              <td>
                <StatusChip status={r.s} size="sm" showStatus />
              </td>
              <td className="num">{r.n}</td>
              <td className="num">{r.w == null ? "Not counted" : pts(r.w)}</td>
              <td className="num">{r.w == null ? "—" : pts(r.n * r.w)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Counted</td>
            <td className="num">{counted}</td>
            <td />
            <td className="num">{pts(weighted)}</td>
          </tr>
        </tfoot>
      </table>
      {l.pct != null ? (
        <p className="dm-math__sum">
          <b>
            {pts(weighted)} points ÷ {counted} counted questions = {l.pct}%.
          </b>{" "}
          {met
            ? `That is at or above the ${threshold}% needed, so Level ${l.level} is met.`
            : l.result === "Stops here"
              ? `That is below the ${threshold}% needed, so the dimension stops at Level ${l.level - 1}. It needs ${pts(needPts)} more point${needPts === 1 ? "" : "s"} to meet Level ${l.level}: a No or Not disclosed turning into Yes adds 1, a Partial turning into Yes adds 0.5.`
              : `Level ${l.level} is not counted yet, because a level only counts once every level below it is met.`}
        </p>
      ) : (
        <p className="dm-math__sum">
          None of these questions has an answer yet, so Level {l.level} cannot
          be judged.
        </p>
      )}
      {left > 0 && (
        <p className="dm-math__note">
          {left} question{left === 1 ? "" : "s"} rated Not yet checked, Not
          assessed – access blocked or Not applicable{" "}
          {left === 1 ? "is" : "are"} left out: there is no answer to score.
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  sub,
  wide,
  children,
}: {
  title: string;
  sub?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`dm-card ${wide ? "dm-card--wide" : ""}`}>
      <h3 className="dm-card__title">
        {title}
        {sub && <span className="dm-card__sub">{sub}</span>}
      </h3>
      {children}
    </section>
  );
}

function Body({ d, competitor }: { d: Detail; competitor?: string }) {
  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const [openQ, setOpenQ] = useState<Record<string, boolean>>({});
  return (
    <div
      className="dm"
      style={{
        ["--dc" as string]: DIM_COLOR[d.dimension.code],
        ["--dt" as string]: DIM_TINT[d.dimension.code],
      }}
    >
      <Card
        title="Level results"
        sub={`A level is met when its weighted score reaches ${d.threshold}%, in sequence from Level 1. Select a level to see how its score is worked out, then open a question to see its evidence and sources.`}
        wide
      >
        <ul className="dm-levels">
          <li className="dm-levels__head" aria-hidden="true">
            <span>Level</span>
            <span>What it tests</span>
            <span>Result</span>
            <span>
              Criteria <i className="dm-levels__key" /> {d.threshold}%
              needed
            </span>
            <span />
          </li>
          {d.levels.map((l) => {
            const open = openLevel === l.level;
            const can = l.questions.length > 0;
            const counted = l.counted ?? 0;
            const qids = new Set(l.questions.map((x) => x.qid));
            // Evidence for this level that no question here points to
            const loose = d.evidence.filter(
              (e) =>
                e.cell === `${d.dimension.code}-L${l.level}` &&
                !(e.questions ?? []).some((q) => qids.has(q)),
            );
            const allOpen = l.questions.every((x) => openQ[x.qid]);
            return (
              <Fragment key={l.level}>
                <li>
                  <button
                    type="button"
                    className={`dm-level ${open ? "is-open" : ""}`}
                    disabled={!can}
                    onClick={() => {
                      setOpenLevel(open ? null : l.level);
                      setOpenQ({});
                    }}
                    aria-expanded={can ? open : undefined}
                  >
                    <span className="dm-level__n">
                      <b>L{l.level}</b>
                      <small>{l.name}</small>
                    </span>
                    <span className="dm-level__test">{l.test || "—"}</span>
                    <span className="dm-level__gate">
                      {l.gate ? (
                        <span className={`pill ${GATE_PILL[l.gate] ?? ""}`}>
                          {l.gate}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </span>
                    <span
                      className="dm-level__bar"
                      title={
                        l.pct != null
                          ? `${l.pct}% weighted score; ${d.threshold}% is needed to meet the level`
                          : "No answered questions"
                      }
                    >
                      <span className="dm-level__track">
                        <span
                          style={{ width: `${Math.min(100, l.pct ?? 0)}%` }}
                        />
                        <i style={{ left: `${d.threshold}%` }} />
                      </span>
                      <small>
                        {l.pct != null ? (
                          <>
                            <b>{l.pct}%</b> (needs {d.threshold}%) · {l.yes} Yes
                            of {counted || l.total} counted
                          </>
                        ) : l.total ? (
                          `No answered questions yet · ${l.total} pending`
                        ) : (
                          "No questions test this level"
                        )}
                      </small>
                    </span>
                    <span className="dm-level__chev">
                      {can && <ChevronDown16Regular />}
                    </span>
                  </button>
                </li>
                {open && (
                  <li className="dm-math-wrap">
                    <LevelMath l={l} threshold={d.threshold} weights={d.weights} />
                  </li>
                )}
                {open && (
                  <li className="dm-qs">
                    <div className="dm-qs__bar">
                      <span>
                        {l.questions.length} question
                        {l.questions.length === 1 ? "" : "s"} at Level {l.level}
                      </span>
                      <button
                        type="button"
                        className="dm-qs__all"
                        onClick={() =>
                          setOpenQ((o) => ({
                            ...o,
                            ...Object.fromEntries(
                              l.questions.map((x) => [x.qid, !allOpen]),
                            ),
                          }))
                        }
                      >
                        {allOpen
                          ? "Hide all evidence and sources"
                          : "Show all evidence and sources"}
                      </button>
                    </div>
                    {l.questions.map((x) => (
                      <QuestionItem
                        key={x.qid}
                        x={x}
                        d={d}
                        competitor={competitor}
                        open={!!openQ[x.qid]}
                        onToggle={() =>
                          setOpenQ((o) => ({ ...o, [x.qid]: !o[x.qid] }))
                        }
                      />
                    ))}
                    {loose.length > 0 && (
                      <div className="dm-qs__item dm-qs__item--loose">
                        <p className="dm-qev__h">
                          Other evidence for Level {l.level}
                        </p>
                        <ul className="dm-qev__list">
                          {loose.map((e) => (
                            <EvidenceLine key={e.id} e={e} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

const APPROVAL_PILL: Record<string, string> = {
  Approved: "pill--green",
  "Pending review": "pill--blue",
  Rejected: "pill--red",
  "Changes requested": "pill--amber",
};

/** One question in Level results, with its evidence and sources behind "View evidence and sources". */
function QuestionItem({
  x,
  d,
  competitor,
  open,
  onToggle,
}: {
  x: QItem;
  d: Detail;
  competitor?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const ev = d.evidence.filter((e) => (e.questions ?? []).includes(x.qid));
  // The question's own citations first, then any further sources its evidence rests on
  const codes = [
    ...new Set([...x.sources, ...ev.flatMap((e) => e.sources ?? [])]),
  ];
  const byCode = new Map(d.sources.map((s) => [s.code, s]));
  const src = codes.map(
    (c) =>
      byCode.get(c) ?? {
        code: c,
        title: "",
        publisher: "",
        date: "",
        source_type: "",
        group: "Not logged",
        url: "",
        cited_by: [],
        old: false,
      },
  );
  const n = ev.length + src.length;
  const panel = `dm-qev-${x.qid}`;
  return (
    <div className={`dm-qs__item ${open ? "is-open" : ""}`}>
      <div className="dm-qs__top">
        <span className="qid-inline">{x.qid}</span>
        <StatusChip status={x.status} size="sm" showStatus />
      </div>
      <p className="dm-qs__q">{x.text}</p>
      <p className="dm-qs__f">{x.finding}</p>
      {n === 0 ? (
        <p className="dm-qev__none">
          {competitor
            ? `No evidence or sources for ${competitor} yet.`
            : "No evidence or sources linked yet."}
        </p>
      ) : (
        <>
          <button
            type="button"
            className="dm-qev__toggle"
            aria-expanded={open}
            aria-controls={panel}
            onClick={onToggle}
          >
            <ChevronDown16Regular className="dm-qev__chev" />
            {open ? "Hide evidence and sources" : "View evidence and sources"}
            <span className="dm-qev__count">
              {ev.length} evidence · {src.length} source
              {src.length === 1 ? "" : "s"}
            </span>
          </button>
          {open && (
            <div id={panel} className="dm-qev">
              <section>
                <p className="dm-qev__h">
                  Evidence <span>{ev.length}</span>
                </p>
                {ev.length ? (
                  <ul className="dm-qev__list">
                    {ev.map((e) => (
                      <EvidenceLine key={e.id} e={e} />
                    ))}
                  </ul>
                ) : (
                  <p className="muted dm-qev__empty">
                    No evidence record names this question.
                  </p>
                )}
              </section>
              <section>
                <p className="dm-qev__h">
                  Sources <span>{src.length}</span>
                </p>
                {src.length ? (
                  <ul className="dm-qev__list">
                    {src.map((s) => (
                      <SourceLine key={s.code} s={s} />
                    ))}
                  </ul>
                ) : (
                  <p className="muted dm-qev__empty">No source cited.</p>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EvidenceLine({ e }: { e: EvidenceRow }) {
  return (
    <li>
      <span className="dm-list__id">
        {e.eid}
        {e.h_flag && (
          <span className="h-flag" title="Older than 12 months">
            H
          </span>
        )}
      </span>
      <span className="dm-list__main">
        <b>{e.title}</b>
        {e.claim && <span className="dm-qev__claim">{e.claim}</span>}
        <small>
          {[
            e.cell,
            e.stage,
            e.confidence && `${e.confidence} confidence`,
            e.result,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
      <span className="dm-list__tags">
        <span className={`pill ${APPROVAL_PILL[e.approval] ?? ""}`}>
          {e.approval}
        </span>
      </span>
    </li>
  );
}

function SourceLine({ s }: { s: SourceRow }) {
  return (
    <li>
      <span className="dm-list__id">
        {s.code}
        {s.old && (
          <span className="h-flag" title="Older than 12 months">
            H
          </span>
        )}
      </span>
      <span className="dm-list__main">
        {s.url ? (
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.title || s.url} <Open16Regular className="src-ext" />
          </a>
        ) : (
          <b>{s.title || "Not in the source log"}</b>
        )}
        <small>{[s.publisher, s.date].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="dm-list__tags">
        {s.group && s.group !== "Not logged" && (
          <span
            className={`pill ${GROUP_PILL[s.group] ?? ""}`}
            title={s.source_type}
          >
            {s.group}
          </span>
        )}
      </span>
    </li>
  );
}
