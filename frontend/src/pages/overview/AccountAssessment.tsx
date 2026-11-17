import { useEffect, useRef, useState } from "react";
import { Query } from "../../components/Query";
import { useDimensionDetail } from "../../components/DimensionModal";
import { useFilters } from "../../lib/filters";
import {
  ChevronDown16Regular,
  Checkmark16Regular,
  Dismiss16Regular,
  History16Regular,
  Info16Regular,
} from "@fluentui/react-icons";
import { BrandLogo } from "../../components/BrandLogo";
import { DimensionOverview } from "../../components/DimensionOverview";
import { OverallRating } from "../../components/OverallRating";
import {
  DemoNotice,
  LevelDots,
  PageHeader,
  Panel,
} from "../../components/ui";
import {
  useMeta,
  useScoped,
  type DimCode,
  type Info,
  type Score,
} from "../../lib/api";
import { DIM_COLOR, fmtPeriod } from "../../lib/constants";
import { dryRunQuestionCount, hasDryRun } from "../../lib/dryRun";
import {
  SAMPLE_PERIOD,
  hasSample,
  sampleValue,
  sampleWhy,
  withSampleScore,
} from "../../lib/sample";

interface Data {
  info: Info;
  scores: Score[];
  baseline: Record<string, string>;
  totals: {
    questions: number;
    maturity: number;
    competitive_vendor: number;
    competitive_retailer: number;
    set_size: number;
  };
  status: { status: string; all: number; maturity: number }[];
  evidence: {
    records: number;
    confidence: Record<string, number>;
    h_flagged: number;
  };
  flags: { total: number; error: number; warn: number; info: number };
  trend: {
    period: string;
    data_source: string;
    scores: Record<DimCode, number>;
  }[];
}

export default function AccountAssessment() {
  const q = useScoped<Data>("/api/assessment");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta();
  // The dimension picked on the cards; its sub-themes show below. Picking it again clears it.
  // A dimension, or "all" for the AI Maturity Score card; its breakdown shows below
  const [selected, setSelected] = useState<DimCode | "all" | null>(null);
  const pick = (c: DimCode | "all") => setSelected((cur) => (cur === c ? null : c));
  const dimName = (c: string) =>
    meta?.dimensions.find((x) => x.code === c)?.short ?? c;
  const slug = d.info.retailer.slug;
  // Best Buy and Amazon are scored from the dry-run question set
  const dry = hasDryRun(slug);
  const questionCount = dry ? dryRunQuestionCount : d.totals.questions;
  // Why this score: one dimension open at a time
  const [whyOpen, setWhyOpen] = useState<DimCode | null>(null);
  const scores = d.scores.map(withSampleScore(slug));

  return (
    <>
      <div className="aa-stack">
        <div className="aa-top">
          <PageHeader info={d.info} />
        </div>
        <DemoNotice info={d.info} />

        <section className="hero" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
        <div className="hero__intro hero__intro--split">
          {/* <p className="kicker">{ROUTE_NAME[d.info.retailer.route]} · {d.info.retailer.segment}</p> */}
          <div className="hero__who">
            <BrandLogo id={d.info.retailer.slug} height={32} className="hero__logo" />
            <h2 className="hero__name">{d.info.retailer.name}</h2>
            <p className="hero__meta">
              {d.info.market.name} · {fmtPeriod(d.info.period, true)}
            </p>
          </div>
          <div className="hero__read">
            <OverallRating
              scores={d.scores}
              retailer={slug}
              selected={selected === "all"}
              onSelect={() => pick("all")}
            />
          </div>
          <aside className="hero__how" aria-labelledby="hero-how-title">
            <h3 id="hero-how-title">
              <Info16Regular aria-hidden="true" />
              How your AI maturity score works
            </h3>
            <p>
              Your score is based on {questionCount} questions across four
              dimensions (D1–D4). Each question maps to one of five AI maturity
              levels, L1 through L5. Each answer is rated Good (1), Okay (0.5) or
              Needs Optimization (0); N/A answers are left out.
            </p>
            <p>
              Each dimension’s score is the average of its question scores × 5,
              and each level shows the average of its own questions. For example,
              an average of 68% gives 3.40. The overall score is the average of
              D1–D4.
            </p>
          </aside>
        </div>
        <div className="hero__dims">
          {scores.map((s) => (
            <div
              key={s.dimension}
              className={`dimscore dimscore--click ${selected === s.dimension ? "is-on" : ""}`}
              style={{
                ["--dc" as string]: DIM_COLOR[s.dimension],
                ["--ds" as string]: DIM_COLOR[s.dimension],
              }}
              role="button"
              aria-pressed={selected === s.dimension}
              tabIndex={0}
              aria-label={`${s.dimension} ${dimName(s.dimension)}: ${s.label}. Show this dimension's sub-themes below`}
              title="Show this dimension's sub-themes below"
              onClick={() => pick(s.dimension)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(s.dimension);
                }
              }}
            >
              <div className="dimscore__top">
                <span className="dimscore__code">{s.dimension}</span>
                <span className="dimscore__name">{dimName(s.dimension)}</span>
              </div>
              <div className="dimscore__value">
                {s.level ? s.value.toFixed(2) : "—"}
                {s.h && (
                  <span
                    className="h-flag"
                    title="Key evidence older than 12 months"
                  >
                    H
                  </span>
                )}
              </div>
              <div className="dimscore__stage">
                {s.level
                  ? `${s.stage} · Level ${s.level} met`
                  : "Not established"}
              </div>
              <LevelDots score={s} />
            </div>
          ))}
        </div>
        </section>
      </div>

      <div className="grid-2 grid-2--why aa-row">
        <Panel
          title="Why this score"
          sub="The reasons behind each dimension's level."
        >
          {scores.map((s) => (
            <WhyDimension
              key={s.dimension}
              retailer={slug}
              open={whyOpen === s.dimension}
              onToggle={() =>
                setWhyOpen((o) => (o === s.dimension ? null : s.dimension))
              }
              code={s.dimension}
              name={dimName(s.dimension)}
            />
          ))}
        </Panel>
        <Panel
          title="Month on month"
          sub="Score by dimension for every month on file. Hover a point for its value."
        >
          <Trend
            trend={d.trend}
            current={d.info.period}
            retailer={slug}
            dimName={dimName}
          />
        </Panel>
      </div>

      <DimensionOverview selected={selected} onSelect={pick} />

      <Panel className="aa-row" title="Run notes">
        <ul className="notes">
          {dry ? (
            <>
              <li>
                Scored from the dry run of 6 November 2026: {questionCount} questions,
                each answered and scored for {d.info.retailer.name} with its sources.
              </li>
              <li>
                Each dimension’s score is the average of its question scores (Good 1,
                Okay 0.5, Needs Optimization 0) × 5; every lens counts and N/A answers
                are left out.
              </li>
            </>
          ) : (
            d.info.notes
              .slice(0, -2)
              .filter((n) => !/illustrative/i.test(n))
              .map((n) => (
                <li key={n}>
                  {n.replace(
                    /^Scored from the 95 maturity questions of the 158-question set/,
                    `Scored from the ${d.totals.questions} questions of the question set`,
                  )}
                </li>
              ))
          )}
        </ul>
      </Panel>
    </>
  );
}

/** One reason for a dimension's score. */
function WhyReason({ kind, text }: { kind: string; text: string }) {
  return (
    <li className={`dm-why__${kind}`}>
      <span className="dm-why__icon" aria-hidden="true">
        {kind === "met" ? (
          <Checkmark16Regular />
        ) : kind === "h" ? (
          <History16Regular />
        ) : (
          <Dismiss16Regular />
        )}
      </span>
      <span>{text}</span>
    </li>
  );
}

/** One dimension's reasons for its score, from the same scorecard as the dimension pop-up. Click the heading to fold it. */
function WhyDimension({
  retailer: slug,
  open,
  onToggle,
  code,
  name,
}: {
  retailer: string;
  open: boolean;
  onToggle: () => void;
  code: DimCode;
  name: string;
}) {
  const { retailer, market, period, sku } = useFilters();
  const q = useDimensionDetail(code, retailer, market, period, sku);
  // Reasons follow the score shown on the cards
  const why = sampleWhy(slug, code, q.data?.why ?? []);
  const listId = `why-${code}`;
  return (
    <section className={`why-dim ${open ? "" : "is-closed"}`}>
      <h3 className="why-dim__title">
        <button
          type="button"
          className="why-dim__toggle"
          aria-expanded={open}
          aria-controls={listId}
          onClick={onToggle}
        >
          <span className="dimcode" style={{ color: DIM_COLOR[code] }}>
            {code}
          </span>{" "}
          {name}
          <ChevronDown16Regular className="why-dim__chev" aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <ul className="dm-why" id={listId}>
          {why.map((w, i) => (
            <WhyReason key={i} kind={w.kind} text={w.text} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Month on month: one row per dimension, a shared guide line and a tooltip for the hovered month. */
function Trend({
  trend,
  current,
  retailer,
  dimName,
}: {
  trend: Data["trend"];
  current: string;
  retailer: string;
  dimName: (c: string) => string;
}) {
  const dims: DimCode[] = Object.keys(trend[trend.length - 1]?.scores ?? {});
  // Only months with a workflow run, or the month the placeholder scores stand for, are enabled;
  // every other month is greyed out
  const live = trend.map(
    (t) =>
      t.data_source === "workflow" ||
      (hasSample(retailer) && t.period === SAMPLE_PERIOD),
  );
  const val = (i: number, dc: DimCode) =>
    live[i] ? sampleValue(retailer, dc, trend[i].scores[dc] ?? 0) : 0;
  const top = Math.max(
    5,
    ...trend.flatMap((_, i) => dims.map((dc) => Math.ceil(val(i, dc)))),
  );
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real width so points stay round
  const plot = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(480);
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    // Measure now too, so the first draw is at the real width even before the observer reports
    setW(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(200, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ROW = 72,
    padX = 12,
    padY = 10,
    n = trend.length;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, n - 1);
  const y = (v: number) => padY + (1 - v / top) * (ROW - padY * 2);
  const cur = trend.findIndex((t) => t.period === current);
  const shown = hover ?? cur;
  const fmt = (v: number) => (v > 0 ? v.toFixed(2) : "—");

  const onMove = (e: React.MouseEvent) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r) return;
    const step = (W - padX * 2) / Math.max(1, n - 1);
    const i = Math.max(
      0,
      Math.min(n - 1, Math.round((e.clientX - r.left - padX) / step)),
    );
    // Only enabled months react; the rest show a disabled cursor and no tooltip
    setHover(live[i] ? i : null);
  };

  const tipLeft = hover != null ? x(hover) : 0;
  const tipRight = hover != null && tipLeft > W / 2;

  return (
    <div className="mom">
      <div className="mom__labels">
        {dims.map((dc) => (
          <div key={dc} className="mom__label" style={{ height: ROW }}>
            <b style={{ color: DIM_COLOR[dc] }}>{dc}</b>
            <span title={dimName(dc)}>{dimName(dc)}</span>
          </div>
        ))}
      </div>

      <div
        className="mom__plot"
        ref={plot}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: hover != null ? "pointer" : "not-allowed" }}
      >
        {dims.map((dc) => {
          const pts = trend.flatMap((_, i) =>
            live[i] ? [[x(i), y(val(i, dc)), i] as const] : [],
          );
          return (
            <svg
              key={dc}
              width={W}
              height={ROW}
              className="mom__svg"
              aria-label={`${dc} by month`}
            >
              {Array.from({ length: top + 1 }, (_, l) => l).map((l) => (
                <line
                  key={l}
                  x1={0}
                  x2={W}
                  y1={y(l)}
                  y2={y(l)}
                  className={l === 0 ? "mom__base" : "mom__grid"}
                />
              ))}
              <polyline
                points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill="none"
                stroke={DIM_COLOR[dc]}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map(([px, py, i]) => {
                const on = i === hover;
                const isCur = i === cur;
                return (
                  <circle
                    key={i}
                    cx={px}
                    cy={py}
                    r={on ? 6 : isCur ? 5 : 3.5}
                    fill={on || isCur ? DIM_COLOR[dc] : "#fff"}
                    stroke={on ? "#fff" : DIM_COLOR[dc]}
                    strokeWidth={on ? 2.5 : 1.75}
                    onMouseEnter={() => setHover(i)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </svg>
          );
        })}

        <div className="mom__axis">
          {trend.map((t, i) => {
            // Label every k-th month so names never overlap; the latest month is always labelled
            const step = (W - padX * 2) / Math.max(1, n - 1);
            const every = Math.max(1, Math.ceil(40 / step));
            if ((n - 1 - i) % every !== 0) return null;
            return (
              <button
                key={t.period}
                type="button"
                className={`mom__month ${i === shown ? "is-on" : ""}`}
                style={{ left: x(i) }}
                disabled={!live[i]}
                title={live[i] ? undefined : "No run this month"}
                onMouseEnter={() => live[i] && setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {fmtPeriod(t.period).split(" ")[0]}
              </button>
            );
          })}
        </div>

        {hover != null && (
          <>
            <div className="mom__cross" style={{ left: x(hover) }} />
            <div
              className={`mom__tip ${tipRight ? "is-left" : ""}`}
              style={{ left: tipLeft }}
              role="tooltip"
            >
              <b className="mom__tip-h">
                {fmtPeriod(trend[hover].period, true)}
              </b>
              <small className="mom__tip-src">
                {trend[hover].data_source === "not_run"
                  ? "Not run yet"
                  : "Assessment run"}
              </small>
              <ul>
                {dims.map((dc) => (
                  <li key={dc}>
                    <i style={{ background: DIM_COLOR[dc] }} />
                    <span>
                      {dc} · {dimName(dc)}
                    </span>
                    <b>{fmt(val(hover, dc))}</b>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="mom__vals">
        {dims.map((dc) => (
          <div key={dc} className="mom__val" style={{ height: ROW }}>
            {shown >= 0 ? fmt(val(shown, dc)) : "—"}
          </div>
        ))}
      </div>
    </div>
  );
}
