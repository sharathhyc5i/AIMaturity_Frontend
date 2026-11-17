import {
  Open16Regular,
  Search20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { useDeferredValue, useMemo, useState } from "react";
import { useMeta, type QRow } from "../lib/api";
import type { QuestionSources } from "../lib/sampleSources";
import { DIM_COLOR, RATINGS, RATING_OF } from "../lib/constants";
import { DimTag, Drawer, Lvl, Sources, StatusChip } from "./ui";

const PAGE = 40;

const PARAMS: Record<string, string> = {
  "[VENDOR]": "Microsoft",
  "[VENDOR SKUS]": "Microsoft devices and software",
  "[COMPETING VENDORS]": "competing vendors",
  "[PEER RETAILERS]": "peer retailers",
};
/** Swap run-parameter placeholders for their values, marking each so it reads as a parameter. */
export function Filled({ text, on = true }: { text: string; on?: boolean }) {
  if (!on) return <>{text}</>;
  const parts = text.split(/(\[[A-Z ]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        PARAMS[p] ? (
          <span key={i} className="param" title={p}>
            {PARAMS[p]}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** A logged source, for turning source IDs into links. */
export interface SourceRef {
  title: string;
  url: string;
  publisher: string;
  date: string;
  source_type: string;
}

/** Supplied = carried or modified from the supplied question sheet; Added = new in this set. */
export const originOf = (r: QRow) =>
  r.change === "New" ? "Added" : "Supplied";

/** Source IDs as links to the logged source (plain IDs when a source is not in the log). */
export function SourceLinks({
  ids,
  map,
}: {
  ids: string[];
  map?: Record<string, SourceRef>;
}) {
  if (!ids.length) return <span className="muted">—</span>;
  return (
    <span className="srcs">
      {ids.map((s) => {
        const ref = map?.[s];
        return ref?.url ? (
          <a
            key={s}
            href={ref.url}
            target="_blank"
            rel="noreferrer"
            title={`${ref.title}${ref.publisher ? ` · ${ref.publisher}` : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <code>{s}</code>
          </a>
        ) : (
          <code key={s} title={ref?.title}>
            {s}
          </code>
        );
      })}
    </span>
  );
}

function OpenFirst({
  ids,
  map,
}: {
  ids: string[];
  map?: Record<string, SourceRef>;
}) {
  const first = ids.find((s) => map?.[s]?.url);
  if (!first) return <span className="muted">—</span>;
  return (
    <a
      className="open-src"
      href={map![first].url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      Open {first} <Open16Regular />
    </a>
  );
}

/** Filterable question list. Wide screens get a table; narrow screens get stacked rows.
 *  `scorecard` shows the columns of the question-by-question scorecard sheet. */
export function QuestionTable({
  rows,
  showStatus = true,
  initialStatus = "",
  initialLens = "",
  hideDim = false,
  fill = true,
  scorecard = false,
  sources,
  hideFinding = false,
  showRetailer = false,
  hideLens = false,
}: {
  rows: QRow[];
  showStatus?: boolean;
  initialStatus?: string;
  initialLens?: string;
  hideDim?: boolean;
  fill?: boolean;
  scorecard?: boolean;
  sources?: Record<string, SourceRef>;
  /** Leave out the Finding column */
  hideFinding?: boolean;
  /** Add a Retailer column, for lists that mix retailers (rows carry `retailer`) */
  showRetailer?: boolean;
  /** Leave out the Lens column and the lens filter */
  hideLens?: boolean;
}) {
  const { data: meta } = useMeta();
  const dimName = (c: string) =>
    meta?.dimensions.find((x) => x.code === c)?.name ?? c;
  const [q, setQ] = useState("");
  const [lens, setLens] = useState(initialLens);
  const [status, setStatus] = useState(initialStatus);
  const [flagged, setFlagged] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<QRow | null>(null);
  const dq = useDeferredValue(q);

  const filtered = useMemo(() => {
    const k = dq.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!lens || r.lens === lens) &&
        (!status || RATING_OF[r.status] === status) &&
        (!flagged || r.flags.length > 0) &&
        (!k ||
          `${r.qid} ${r.text} ${r.sub_theme} ${r.finding}`
            .toLowerCase()
            .includes(k)),
    );
  }, [rows, dq, lens, status, flagged]);
  const anyFlags = rows.some((r) => r.flags.length);

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Search20Regular />
          <input
            type="search"
            placeholder="Search questions, findings, IDs"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Search questions"
          />
        </label>
        {!hideLens && (
          <select
            className="select"
            value={lens}
            onChange={(e) => {
              setLens(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Lens"
          >
            <option value="">All lenses</option>
            <option>Maturity</option>
            <option value="Competitive · vendor">OEM</option>
            <option>Competitive · retailer</option>
          </select>
        )}
        {showStatus && (
          <select
            className="select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Rating"
          >
            <option value="">All ratings</option>
            {RATINGS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        {showStatus && anyFlags && (
          <label className="check">
            <input
              type="checkbox"
              checked={flagged}
              onChange={(e) => setFlagged(e.target.checked)}
            />{" "}
            Flagged only
          </label>
        )}
        <span className="toolbar__count" aria-live="polite">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="muted qt-empty">
          No question matches these filters. Clear the search or choose another
          status.
        </p>
      ) : (
        <>
          {scorecard ? (
            <div className="table-wrap qt-wide">
              <table className="table qt-score">
                <thead>
                  <tr>
                    <th>Q-ID</th>
                    {!hideDim && <th>Dimension</th>}
                    <th>Question</th>
                    <th className="num">Tests level</th>
                    <th>Status</th>
                    <th>Finding</th>
                    <th>Source IDs</th>
                    <th>Open first source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, limit).map((r) => (
                    <tr
                      key={r.qid}
                      className="is-click"
                      tabIndex={0}
                      onClick={() => setOpen(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setOpen(r);
                      }}
                    >
                      <td className="qid">{r.qid}</td>
                      {!hideDim && (
                        <td className="qt-dim">
                          <b
                            style={{ color: DIM_COLOR[r.dimension] }}
                            className="dimcode"
                          >
                            {r.dimension}
                          </b>
                          <small>{dimName(r.dimension)}</small>
                        </td>
                      )}
                      <td className="q">
                        <Filled text={r.text} on={fill} />
                        {r.lens !== "Maturity" && (
                          <span className="qt-lens">
                            <LensPill lens={r.lens} />
                          </span>
                        )}
                        {r.flags.length > 0 && (
                          <span className="qt-flag">
                            <Warning20Regular />
                            {r.flags[0]}
                            {r.flags.length > 1
                              ? ` (+${r.flags.length - 1})`
                              : ""}
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {r.level ?? <span className="muted">—</span>}
                      </td>
                      <td>
                        <StatusChip status={r.status} size="sm" />
                      </td>
                      <td className="wrap-sm">{r.finding}</td>
                      <td>
                        <SourceLinks ids={r.sources} map={sources} />
                      </td>
                      <td className="nowrap">
                        <OpenFirst ids={r.sources} map={sources} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap qt-wide">
              <table className="table">
                <thead>
                  <tr>
                    <th>Q-ID</th>
                    {showRetailer && <th>Retailer</th>}
                    <th>Question</th>
                    <th className="num">Score</th>
                    {!hideLens && <th>Lens</th>}
                    <th>Level</th>
                    {showStatus && (
                      <>
                        <th>Status</th>
                        {!hideFinding && <th>Finding</th>}
                        <th>Sources</th>
                      </>
                    )}
                    {!showStatus && (
                      <>
                        <th>How the agent answers it</th>
                        <th>Cadence</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, limit).map((r) => (
                    <tr
                      key={`${r.retailer ?? ""}|${r.qid}`}
                      className="is-click"
                      tabIndex={0}
                      onClick={() => setOpen(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setOpen(r);
                      }}
                    >
                      <td className="qid">{r.qid}</td>
                      {showRetailer && <td className="nowrap">{r.retailer}</td>}
                      <td className="q">
                        <Filled text={r.text} on={fill} />
                        {r.flags.length > 0 && (
                          <span className="qt-flag">
                            <Warning20Regular />
                            {r.flags[0]}
                            {r.flags.length > 1
                              ? ` (+${r.flags.length - 1})`
                              : ""}
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {r.score != null ? r.score.toFixed(2) : r.status === "N/A" ? "N/A" : "—"}
                      </td>
                      {!hideLens && (
                        <td>
                          <LensPill lens={r.lens} />
                        </td>
                      )}
                      <td>
                        <Lvl n={r.level} />
                      </td>
                      {showStatus && (
                        <>
                          <td>
                            <StatusChip status={r.status} size="sm" />
                          </td>
                          {!hideFinding && (
                            <td className="wrap-sm">{r.finding}</td>
                          )}
                          <td>
                            <Sources ids={r.sources} />
                          </td>
                        </>
                      )}
                      {!showStatus && (
                        <>
                          <td className="wrap-sm">{r.how}</td>
                          <td className="nowrap">{r.cadence}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ul className="rows qt-narrow">
            {filtered.slice(0, limit).map((r) => (
              <li key={`${r.retailer ?? ""}|${r.qid}`}>
                <button
                  type="button"
                  className="qt-card"
                  onClick={() => setOpen(r)}
                >
                  <span className="qt-card__top">
                    <span className="qid-inline">{r.qid}</span>
                    {showRetailer && <span className="pill">{r.retailer}</span>}
                    {!hideDim && <DimTag code={r.dimension} />}
                    {scorecard ? (
                      <>
                        {r.level && <span className="pill">L{r.level}</span>}
                      </>
                    ) : (
                      !hideLens && <LensPill lens={r.lens} />
                    )}
                    {showStatus && <StatusChip status={r.status} size="sm" />}
                  </span>
                  <span className="qt-card__q">
                    <Filled text={r.text} on={fill} />
                  </span>
                  {showStatus && !hideFinding && (
                    <span className="qt-card__f">{r.finding}</span>
                  )}
                  {scorecard && r.sources.length > 0 && (
                    <span className="qt-card__src">
                      <SourceLinks ids={r.sources} map={sources} />
                    </span>
                  )}
                  {r.flags.length > 0 && (
                    <span className="qt-flag">
                      <Warning20Regular />
                      {r.flags[0]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="qt-more">
              <button
                type="button"
                className="btn"
                onClick={() => setLimit((l) => l + PAGE)}
              >
                Show {Math.min(PAGE, filtered.length - limit)} more
              </button>
            </div>
          )}
        </>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={
          open && (
            <>
              <span className="qid-inline">{open.qid}</span>
              <h2 className="drawer__h">
                <Filled text={open.text} on={fill} />
              </h2>
            </>
          )
        }
      >
        {open && (
          <QuestionDetail r={open} showStatus={showStatus} sources={sources} />
        )}
      </Drawer>
    </>
  );
}

export function LensPill({ lens }: { lens: string }) {
  if (lens === "Maturity")
    return <span className="pill pill--blue">Maturity</span>;
  if (lens === "Competitive · vendor")
    return <span className="pill pill--violet">OEM</span>;
  return <span className="pill pill--amber">Retailer axis</span>;
}

export function QuestionDetail({
  r,
  showStatus,
  sources,
  links,
}: {
  r: QRow;
  showStatus: boolean;
  sources?: Record<string, SourceRef>;
  /** Source pages (S1, …) and evidence notes (EV1, …); replaces the source codes line */
  links?: QuestionSources;
}) {
  return (
    <div className="qd">
      <div className="qd__chips">
        <DimTag code={r.dimension} label={r.sub_theme} />
        <LensPill lens={r.lens} />
      </div>
      {showStatus && (
        <section className="qd__result">
          <StatusChip status={r.status} />
          <p>{r.finding}</p>
          {links ? (
            <div className="qd__refs">
              <div>
                <span className="kicker">Sources</span>
                {links.sources.length ? (
                  <ol className="qd__reflist">
                    {links.sources.map((s, i) => (
                      <li key={i}>
                        <span className="qd__ref">S{i + 1}</span>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.url} <Open16Regular className="src-ext" />
                        </a>
                        {s.note && <small className="muted"> ({s.note})</small>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted qd__na">NA</p>
                )}
              </div>
              <div>
                <span className="kicker">Evidence</span>
                {links.evidence.length ? (
                  <ol className="qd__reflist">
                    {links.evidence.map((e, i) => (
                      <li key={i}>
                        <span className="qd__ref qd__ref--ev">EV{i + 1}</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted qd__na">NA</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <span className="kicker">Sources</span>{" "}
              {sources ? (
                <SourceLinks ids={r.sources} map={sources} />
              ) : (
                <Sources ids={r.sources} />
              )}
            </div>
          )}
          {sources && r.sources.some((s) => sources[s]) && (
            <ul className="qd__srcs">
              {r.sources
                .filter((s) => sources[s])
                .map((s) => (
                  <li key={s}>
                    <code>{s}</code>
                    {sources[s].url ? (
                      <a href={sources[s].url} target="_blank" rel="noreferrer">
                        {sources[s].title} <Open16Regular className="src-ext" />
                      </a>
                    ) : (
                      sources[s].title
                    )}
                    <small className="muted">
                      {[
                        sources[s].publisher,
                        sources[s].date,
                        sources[s].source_type,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
      {r.flags.length > 0 && (
        <section className="qd__flags">
          <span className="kicker">Validation flags</span>
          <ul>
            {r.flags.map((f) => (
              <li key={f}>
                <Warning20Regular />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
      <dl className="dl">
        <dt>How the agent answers it</dt>
        <dd>{r.how}</dd>
        <dt>Evidence type</dt>
        <dd>{r.evidence_type}</dd>
        <dt>Answer type</dt>
        <dd>{r.answer_type}</dd>
        <dt>Cadence</dt>
        <dd>{r.cadence}</dd>
      </dl>
      {r.lens !== "Maturity" && (
        <p className="muted qd__note">
          Competitive questions are reported beside the maturity score and never
          change it.
        </p>
      )}
    </div>
  );
}
