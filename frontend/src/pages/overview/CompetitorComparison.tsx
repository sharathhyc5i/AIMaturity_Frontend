import {
  BuildingRetail20Regular,
  Checkmark16Regular,
  ChevronDown20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  DocumentPdf20Regular,
  DocumentTable20Regular,
  PlugConnected20Regular,
  Trophy20Regular,
  type FluentIcon,
} from "@fluentui/react-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DimensionModal } from "../../components/DimensionModal";
import { type OutcomeDim } from "../../components/DimensionCards";
import {
  OverallSummary,
  ScrollBox,
  bandOf,
  themesOf,
} from "../../components/DimensionOverview";
import { QuestionTree } from "../../components/QuestionTree";
import { RatingsKey } from "../../components/RatingsKey";
import { useReadingGuide } from "../../components/ReadingNote";
import { Dropdown } from "../../components/Dropdown";
import { useToast } from "../../components/feedback";
import { Query } from "../../components/Query";
import { LineChart } from "../../components/LineChart";
import { QuestionTable } from "../../components/QuestionTable";
import {
  DemoNotice,
  Loading,
  PageHeader,
  Panel,
  Segmented,
  StackBar,
  Tabs,
} from "../../components/ui";
import {
  getJSON,
  useMeta,
  useScoped,
  type DimCode,
  type Info,
  type QRow,
} from "../../lib/api";
import {
  DIM_COLOR,
  DIM_TINT,
  VENDOR_COLOR,
  fmtPeriod,
} from "../../lib/constants";
import {
  buildReport,
  downloadExcel,
  loadSide,
  printPdf,
  type EntityBlock,
} from "../../lib/exportReport";
import { useFilters } from "../../lib/filters";
import { DISABLED_NOTE } from "../../lib/headerOptions";
import { SAMPLE_PERIOD, hasSample, sampleValue, withSampleScore } from "../../lib/sample";
import { dryRunQuestions, hasDryRun } from "../../lib/dryRun";

/* Retailer comparison: the list does not follow the header retailer; it is always loaded for
 * CMP_RETAILER. Only the retailers in CMP_OPEN can be picked on either side; the rest are greyed out. */
const CMP_RETAILER = "best-buy";
const CMP_OPEN = ["best-buy", "amazon"];
/** Competitor and Technology partner comparisons: only these can be picked; the rest are greyed out. */
const VENDOR_OPEN: Record<string, string[]> = {
  competitor: ["microsoft", "apple"],
  partner: ["dell", "hp"],
};
/** Comparison names that are header retailers, so their logo, scores and pop-up match. */
const CMP_SLUG: Record<string, { slug: string; name: string }> = {
  "best buy": { slug: "best-buy", name: "Best Buy" },
  "amazon.com": { slug: "amazon", name: "Amazon" },
  amazon: { slug: "amazon", name: "Amazon" },
};

interface Bench {
  retailer: string;
  slug: string;
  market: string;
  market_name: string;
  data_source: string;
  current: boolean;
  scores: Record<string, { value: number; label: string }>;
  vendor_yes: number;
  vendor_answered: number;
}
interface Data {
  info: Info;
  vendor: string;
  vendor_skus: string;
  competing_vendors: string[];
  peers: string[];
  vendor_axis: {
    summary: Record<string, number>;
    questions: QRow[];
    themes: { name: string; total: number; yes: number; answered: number }[];
  };
  retailer_axis: { summary: Record<string, number>; questions: QRow[] };
  benchmark: Bench[];
}
type Kind = "retailer" | "competitor" | "partner";
interface Entity {
  name: string;
  source: "workflow" | "illustrative" | "static";
  slug: string;
  scores: Record<string, number | null>;
  overall: number | null;
  trend: Record<string, (number | null)[]>;
}
interface Cmp {
  kind: Kind;
  label: string;
  left_label: string;
  right_label: string;
  retailer: string;
  slug: string;
  market: string;
  market_code: string;
  period: string;
  months: string[];
  dimensions: { code: string; name: string }[];
  options: string[];
  default_left: string;
  default_right: string[];
  current: Entity | null;
  entities: Entity[];
}

export default function CompetitorComparison() {
  const q = useScoped<Data>("/api/competitors");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

interface Picked {
  slug: string;
  name: string;
}

function View({ d }: { d: Data }) {
  const { period } = useFilters();
  // The retailers picked in Retailer comparison (left first); their questions show below
  const [retailers, setRetailers] = useState<Picked[]>([
    { slug: "best-buy", name: "Best Buy" },
    { slug: "amazon", name: "Amazon" },
  ]);
  // The Retailer comparison tab lists the compared retailers' questions; the other tabs keep the competitive questions
  const [kind, setKind] = useState<Kind>("retailer");
  // Names picked on the Competitor and Technology partner tabs, left first
  const [vendors, setVendors] = useState<Record<string, string[]>>({
    competitor: ["Microsoft", "Apple"],
    partner: ["Dell", "HP"],
  });

  // The retailer and dimension picked on a Retailer tab card; cleared when the picks change
  const [focus, setFocus] = useState<Focus | null>(null);
  const pickKey = retailers.map((r) => r.slug).join("|");
  useEffect(() => {
    setFocus((f) => (f && pickKey.split("|").includes(f.slug) ? f : null));
  }, [pickKey]);

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <Compare
        period={period}
        onRetailers={setRetailers}
        onVendors={(k, names) => setVendors((v) => ({ ...v, [k]: names }))}
        onKind={setKind}
        focus={focus}
        onFocus={setFocus}
        below={
          kind === "retailer" ? (
            <RetailerQuestions retailers={retailers} focus={focus} onFocus={setFocus} />
          ) : (
            <VendorQuestions
              key={kind}
              label={kind === "competitor" ? "Competitor" : "Technology partner"}
              vendors={vendors[kind] ?? []}
            />
          )
        }
      />
    </>
  );
}

/** A retailer's dimension picked on a Retailer comparison card. */
interface Focus {
  slug: string;
  name: string;
  code: string;
}

const LENS_TABS = [
  { value: "Maturity", label: "Maturity" },
  { value: "Competitive · vendor", label: "OEM axis" },
  { value: "Competitive · retailer", label: "Retailer axis" },
];

/** The Competitor and Technology partner tabs' questions, per compared vendor or partner. Their questions
 *  are not loaded yet, so the list stays empty; pass rows in here once they are. */
function VendorQuestions({
  label,
  vendors,
  rows = [],
}: {
  /** Dropdown label: "Competitor" or "Technology partner" */
  label: string;
  vendors: string[];
  rows?: (QRow & { vendor?: string })[];
}) {
  const [show, setShow] = useState("all");
  const [lens, setLens] = useState("Maturity");
  const key = vendors.join("|");
  useEffect(() => setShow("all"), [key]);
  const list = (names: string[]) =>
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : (names[0] ?? "");
  const shown = show === "all" ? vendors : [show];
  const visible = rows.filter(
    (r) => r.lens === lens && (!r.vendor || shown.includes(r.vendor)),
  );
  return (
    <Panel
      className="aa-row"
      title="Questions"
      sub={`Every question and its score for ${list(shown)}: maturity, OEM and retailer questions.`}
      actions={
        <div className="qt-actions">
          {vendors.length > 1 && (
            <Dropdown
              label={label}
              value={show}
              onChange={setShow}
              options={[
                { value: "all", label: `All · ${list(vendors)}` },
                ...vendors.map((v) => ({ value: v, label: v })),
              ]}
            />
          )}
          <Tabs
            value={lens}
            onChange={setLens}
            tabs={LENS_TABS.map((t) => ({
              value: t.value,
              label: `${t.label} · ${rows.filter((r) => r.lens === t.value && (!r.vendor || shown.includes(r.vendor))).length}`,
            }))}
          />
        </div>
      }
    >
      {visible.length ? (
        <QuestionTable key={`${show}|${lens}`} rows={visible} hideFinding />
      ) : (
        <p className="muted qt-empty">
          No {LENS_TABS.find((t) => t.value === lens)?.label}{" "}
          questions for {list(shown)} yet. They will appear here once they are
          loaded.
        </p>
      )}
    </Panel>
  );
}

interface Outcomes {
  info: Info;
  dimensions: OutcomeDim[];
  questions: QRow[];
}

/** The compared retailers' questions, as on Account assessment: a picked dimension's sub-themes, then every
 *  question by dimension and level, for both retailers or one at a time. */
function RetailerQuestions({
  retailers,
  focus,
  onFocus,
}: {
  retailers: Picked[];
  focus: Focus | null;
  onFocus: (f: Focus | null) => void;
}) {
  const f = useFilters();
  const { data: meta } = useMeta();
  const [show, setShow] = useState("all");
  const key = retailers.map((r) => r.slug).join("|");
  useEffect(() => setShow("all"), [key]);
  // A dimension picked on a card shows that retailer's questions, and the panel scrolls into view
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focus) return;
    setShow(focus.slug);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);
  const qs = useQueries({
    queries: retailers.map((r) => ({
      queryKey: ["/api/outcomes", r.slug, f.market, f.period, f.sku],
      queryFn: () =>
        getJSON<Outcomes>(
          `/api/outcomes?${new URLSearchParams({ retailer: r.slug, market: f.market, period: f.period, sku: f.sku })}`,
        ),
      enabled: f.ready,
    })),
  });
  const shown = retailers.filter((r) => show === "all" || r.slug === show);
  const names = (list: Picked[]) =>
    list.length > 1
      ? `${list
          .slice(0, -1)
          .map((r) => r.name)
          .join(", ")} and ${list[list.length - 1].name}`
      : (list[0]?.name ?? "");
  const loading = qs.some((q) => !q.data);
  const where = qs.find((q) => q.data)?.data?.info;
  const dimName = (c: string) => meta?.dimensions.find((x) => x.code === c)?.name ?? c;
  // Each question's status follows its rating from the stored score, as on Account assessment
  // Best Buy and Amazon use their dry-run questions, answers and scores
  const ratedOf = (i: number): QRow[] =>
    hasDryRun(retailers[i].slug)
      ? dryRunQuestions(retailers[i].slug, qs[i].data!.questions)
      : qs[i].data!.questions.map((q) => ({
          ...q,
          status: q.score == null ? q.status : (bandOf(q.score) as QRow["status"]),
        }));
  const fi = focus ? retailers.findIndex((r) => r.slug === focus.slug) : -1;
  const fdim = fi >= 0 ? qs[fi].data?.dimensions.find((x) => x.dimension === focus!.code) : undefined;

  return (
    <div ref={top} className="cmpq">
      {focus && fdim && (
        <Panel
          className="aa-row dimpanel"
          title={`${focus.name} · ${focus.code} by sub-theme`}
          sub="Status of every question in each sub-theme, all lenses."
          actions={
            <button type="button" className="btn btn--subtle" onClick={() => onFocus(null)}>
              Clear
            </button>
          }
        >
          <RatingsKey />
          <ScrollBox key={`${focus.slug}|${focus.code}`}>
            <ul className="themes">
              {themesOf(focus.code as DimCode, ratedOf(fi), fdim.themes).map((t) => (
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
            title={`All ${focus.code} questions`}
            questions={ratedOf(fi).filter((q) => q.dimension === focus.code)}
          />
        </Panel>
      )}
      <Panel
        className="aa-row"
        title="Questions"
        sub={`Every question by dimension and level for ${names(shown)}${
          where ? ` in ${where.market.name}, ${fmtPeriod(where.period, true)}` : ""
        }. Open a question for its lens, finding and sources.`}
        actions={
          retailers.length > 1 && (
            <Dropdown
              label="Retailer"
              value={show}
              onChange={setShow}
              options={[
                { value: "all", label: `All · ${names(retailers)}` },
                ...retailers.map((r) => ({ value: r.slug, label: r.name })),
              ]}
            />
          )
        }
      >
        {loading ? (
          <Loading rows={4} />
        ) : (
          retailers.map((r, i) =>
            show === "all" || r.slug === show ? (
              <section key={r.slug} className="cmpq__retailer">
                {shown.length > 1 && <h3 className="cmpq__h">{r.name}</h3>}
                <QuestionTree
                  dimensions={qs[i].data!.dimensions.map((x) => ({
                    code: x.dimension,
                    name: dimName(x.dimension),
                    score: withSampleScore(r.slug)(x.score),
                  }))}
                  questions={ratedOf(i)}
                  retailer={r.slug}
                />
              </section>
            ) : null,
          )
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- Retailer / competitor / partner comparison */
const KINDS: { value: Kind; label: string; short: string; icon: FluentIcon }[] =
  [
    {
      value: "retailer",
      label: "Retailer comparison",
      short: "Retailers",
      icon: BuildingRetail20Regular,
    },
    {
      value: "competitor",
      label: "Competitor comparison",
      short: "Competitors",
      icon: Trophy20Regular,
    },
    {
      value: "partner",
      label: "Technology partner comparison",
      short: "Partners",
      icon: PlugConnected20Regular,
    },
  ];
const PALETTE = [
  "#eb6834",
  "#1baf7a",
  "#e87ba4",
  "#6250d6",
  "#eda100",
  "#00a3a3",
  "#8a5a44",
  "#2a78d6",
  "#c239b3",
];
const colorOf = (name: string, options: string[]) =>
  VENDOR_COLOR[name] ??
  PALETTE[Math.max(0, options.indexOf(name)) % PALETTE.length];
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A comparison with every score left empty, as on the Competitor tab, until real data is loaded. */
function blankCmp(c: Cmp): Cmp {
  const blank = (e: Entity): Entity => ({
    ...e,
    scores: Object.fromEntries(c.dimensions.map((d) => [d.code, null])),
    overall: null,
    trend: Object.fromEntries(c.dimensions.map((d) => [d.code, c.months.map(() => null)])),
  });
  return { ...c, entities: c.entities.map(blank), current: c.current && blank(c.current) };
}

/** The retailer comparison with header retailers matched by slug and their placeholder scores
 *  applied (the same values as Account assessment, October only). Starts on Best Buy vs Amazon. */
function retailerCmp(c: Cmp): Cmp {
  const rename = (n: string) => CMP_SLUG[n.toLowerCase()]?.name ?? n;
  const entities = c.entities.map((e): Entity => {
    const slug = e.slug || CMP_SLUG[e.name.toLowerCase()]?.slug || "";
    const named = { ...e, name: rename(e.name), slug };
    if (!hasSample(slug)) return named;
    const scores = Object.fromEntries(
      c.dimensions.map((d) => [d.code, sampleValue(slug, d.code, e.scores[d.code] ?? 0)]),
    );
    const vals = Object.values(scores);
    return {
      ...named,
      scores,
      overall: vals.reduce((a, b) => a + b, 0) / vals.length,
      trend: Object.fromEntries(
        c.dimensions.map((d) => [
          d.code,
          c.months.map((m) => (m === SAMPLE_PERIOD ? scores[d.code] : null)),
        ]),
      ),
    };
  });
  const open = entities.filter((e) => CMP_OPEN.includes(e.slug)).map((e) => e.name);
  return {
    ...c,
    entities,
    current: null,
    options: c.options.map(rename),
    default_left: open[0] ?? c.default_left,
    default_right: open.slice(1, 2),
  };
}
/** Vendor logos (brand marks from Simple Icons, in brand colour) in public/logos. */
const VENDOR_LOGO: Record<string, string> = {
  apple: "/logos/apple.svg",
  hp: "/logos/hp.svg",
  dell: "/logos/dell.svg",
  lenovo: "/logos/lenovo.svg",
};
const lvText = (v: number | null | undefined) =>
  v == null ? "—" : v >= 1 ? v.toFixed(2) : "Not established";

/** Plain coloured tile with the name's initial (no brand artwork). */
function Mark({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="vmark"
      style={{
        ["--vc" as string]: color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  );
}

function Compare({
  period,
  onRetailers,
  onVendors,
  onKind,
  focus,
  onFocus,
  below,
}: {
  period: string;
  /** The retailer and dimension picked on a Retailer tab card */
  focus: Focus | null;
  onFocus: (f: Focus | null) => void;
  /** Shown between the cards and the month-by-month chart */
  below?: ReactNode;
  /** Told the retailers picked on the Retailer comparison tab, left first */
  onRetailers: (r: Picked[]) => void;
  /** Told the names picked on the Competitor or Technology partner tab, left first */
  onVendors: (kind: Kind, names: string[]) => void;
  /** Told which comparison tab is open */
  onKind: (k: Kind) => void;
}) {
  const f = useFilters();
  const { data: meta } = useMeta();
  const toast = useToast();
  const guide = useReadingGuide().data;
  const notes = (guide?.items ?? []).map((i) => `${i.topic}: ${i.text}`);
  const top = meta?.levels.length ?? 5;
  const [kind, setKind] = useState<Kind>("retailer");

  // The retailer tab does not follow the header retailer
  const retailer = kind === "retailer" ? CMP_RETAILER : f.retailer;
  const q = useQuery({
    queryKey: ["comparison", kind, retailer, f.market, period, f.sku],
    queryFn: () =>
      getJSON<Cmp>(
        `/api/comparison?${new URLSearchParams({ kind, retailer, market: f.market, period, sku: f.sku })}`,
      ),
    enabled: f.ready,
    placeholderData: (p) => (p?.kind === kind ? p : undefined),
  });
  const c = !q.data
    ? q.data
    : kind === "retailer"
      ? retailerCmp(q.data)
      : kind === "partner"
        ? blankCmp(q.data)
        : q.data;
  const isOpen = (name: string) =>
    kind === "retailer"
      ? CMP_OPEN.includes(c?.entities.find((e) => same(e.name, name))?.slug ?? "")
      : (VENDOR_OPEN[kind]?.includes(name.toLowerCase()) ?? true);

  // Picks per tab, remembered while switching tabs; reset when the header changes,
  // except the retailer tab's, which does not depend on the header retailer
  const [picks, setPicks] = useState<
    Record<string, { left: string; right: string[] }>
  >({});
  const scope = `${f.retailer}|${f.market}`;
  useEffect(
    () => setPicks((p) => (p.retailer ? { retailer: p.retailer } : {})),
    [scope],
  );
  const pick =
    (c && picks[kind]) ||
    (c
      ? { left: c.default_left, right: c.default_right }
      : { left: "", right: [] });
  const setPick = (p: Partial<{ left: string; right: string[] }>) =>
    setPicks((all) => ({ ...all, [kind]: { ...pick, ...p } }));

  // Both sides pick from the same list. The retailer tab starts on the header retailer, which is
  // added to the list when it is not one of the comparison retailers.
  const find = (name: string): Entity | undefined =>
    c?.entities.find((e) => same(e.name, name)) ??
    (c?.current && same(c.current.name, name) ? c.current : undefined);
  const allOptions = c
    ? c.current &&
      kind === "retailer" &&
      !c.options.some((x) => same(x, c.current!.name))
      ? [c.current.name, ...c.options]
      : c.options
    : [];
  const leftEntity = c ? find(pick.left) : undefined;
  const rightOptions = allOptions.filter(
    (x) => !leftEntity || !same(x, leftEntity.name),
  );
  const right = pick.right
    .filter((x) => rightOptions.includes(x) && isOpen(x))
    .map(find)
    .filter((e): e is Entity => !!e);
  const setLeft = (v: string) => {
    const keep = pick.right.filter((x) => !same(x, v) && isOpen(x));
    setPick({
      left: v,
      right: keep.length
        ? keep
        : allOptions.filter((x) => !same(x, v) && isOpen(x)).slice(0, 1),
    });
  };

  // Share the picked retailers with the questions below
  const pickedKey =
    kind === "retailer" && leftEntity
      ? [leftEntity, ...right].map((e) => `${e.slug}:${e.name}`).join("|")
      : "";
  useEffect(() => {
    if (!pickedKey) return;
    onRetailers(
      pickedKey
        .split("|")
        .map((s) => {
          const [slug, name] = s.split(":");
          return { slug, name };
        })
        .filter((r) => r.slug),
    );
  }, [pickedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // and the picked vendors or partners with those tabs' questions
  const vendorKey =
    kind !== "retailer" && leftEntity
      ? [leftEntity, ...right].map((e) => e.name).join("|")
      : "";
  useEffect(() => {
    if (vendorKey) onVendors(kind, vendorKey.split("|"));
  }, [kind, vendorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [open, setOpen] = useState<{ code: string; e: Entity } | null>(null);
  // On the Retailer tab a retailer's dimension opens its sub-themes and questions on the page (as on
  // Account assessment); picking it again clears it. Other cards open the scorecard pop-up.
  const pickDim = (e: Entity, code: string) => {
    if (kind === "retailer" && e.slug)
      onFocus(
        focus?.slug === e.slug && focus.code === code
          ? null
          : { slug: e.slug, name: e.name, code },
      );
    else setOpen({ code, e });
  };
  const activeOn = (e: Entity) =>
    kind === "retailer" && focus?.slug === e.slug ? focus.code : null;
  const pickLabel =
    kind === "retailer" ? "Show its sub-themes and questions below" : "Open the scorecard";
  const [busy, setBusy] = useState<"" | "pdf" | "excel">("");

  const roleOf = (isLeft: boolean) =>
    kind === "retailer"
      ? "Retailer"
      : kind === "competitor"
        ? isLeft
          ? "Vendor"
          : "Competitor"
        : "Technology partner";
  const block = (e: Entity, isLeft: boolean): EntityBlock => ({
    name: e.name,
    role: roleOf(isLeft),
    source: e.source,
    overall: e.overall,
    dimensions: (c?.dimensions ?? []).map((x) => ({
      code: x.code,
      name: x.name,
      level: e.scores[x.code] ?? null,
    })),
  });
  const exportAs = async (how: "pdf" | "excel") => {
    if (!c || !leftEntity || !right.length) return;
    setBusy(how);
    try {
      const side = leftEntity.slug
        ? {
            retailer: leftEntity.slug,
            retailerName: leftEntity.name,
            market: c.market_code,
            marketName: c.market,
            dataSource: leftEntity.source,
          }
        : null;
      const details = side
        ? await loadSide(
            side,
            period,
            c.dimensions.map((x) => x.code),
            f.sku,
          )
        : [];
      const name =
        `${c.label}_${leftEntity.name}_vs_${right.map((e) => e.name).join("-")}_${period}`.replace(
          /[^A-Za-z0-9_-]+/g,
          "-",
        );
      if (how === "excel") {
        await downloadExcel(
          {
            period,
            kindLabel: c.label,
            where: { retailerName: c.retailer, marketName: c.market },
            left: block(leftEntity, true),
            leftDetail: side ? { side, details } : null,
            right: right.map((e) => block(e, false)),
            months: c.months,
            trends: [leftEntity, ...right].map((e) => ({
              name: e.name,
              trend: e.trend,
            })),
            notes,
          },
          name,
        );
      } else {
        printPdf(
          buildReport(
            period,
            c.label,
            { retailerName: c.retailer, marketName: c.market },
            block(leftEntity, true),
            side ? { side, details } : null,
            right.map((e) => block(e, false)),
            notes,
          ),
        );
      }
    } catch (e) {
      toast("error", `The report could not be built: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <section className="cmpx aa-row" aria-labelledby="cmpx-title">
        <header className="cmpx__top">
          <div className="cmpx__titles">
            <h2 id="cmpx-title" className="cmpx__title">
              Compare AI readiness
            </h2>
            {/* <p className="cmpx__sub">
              {c ? `${c.retailer} · ${c.market} · ` : ""}
              {fmtPeriod(period, true)} · level by dimension, out of {top}
            </p> */}
          </div>
          <div className="cmpx__export">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!!busy || !leftEntity || !right.length}
              onClick={() => exportAs("pdf")}
            >
              <DocumentPdf20Regular />
              {busy === "pdf" ? "Preparing…" : "Download PDF"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!!busy || !leftEntity || !right.length}
              onClick={() => exportAs("excel")}
            >
              <DocumentTable20Regular />
              {busy === "excel" ? "Preparing…" : "Download Excel"}
            </button>
          </div>
        </header>

        <div className="cmpx__tabs" role="tablist" aria-label="Comparison type">
          {KINDS.map((k) => {
            const on = k.value === kind;
            const Icon = k.icon;
            return (
              <button
                key={k.value}
                type="button"
                role="tab"
                aria-selected={on}
                className={`cmpx__tab ${on ? "is-on" : ""}`}
                onClick={() => {
                  setKind(k.value);
                  onKind(k.value);
                }}
              >
                <Icon className="cmpx__tab-icon" />
                <span className="cmpx__tab-label">{k.label}</span>
                <span className="cmpx__tab-short" aria-hidden="true">
                  {k.short}
                </span>
              </button>
            );
          })}
        </div>

        {!c ? (
          <div className="cmpx__body">
            <Loading rows={3} />
          </div>
        ) : (
          <div className="cmpx__body" role="tabpanel" aria-label={c.label}>
            <div className="cmpx__pickers">
              <div className="cmpx__field">
                <span className="cmpx__label">
                  {c.left_label}
                  {kind === "retailer" &&
                    c.current &&
                    same(pick.left, c.current.name) && (
                      <small>from the header</small>
                    )}
                </span>
                <Dropdown
                  label={c.left_label}
                  value={pick.left}
                  onChange={setLeft}
                  wide
                  options={allOptions.map((x) => ({
                    value: x,
                    label: x,
                    disabled: !isOpen(x),
                    hint: !isOpen(x)
                      ? DISABLED_NOTE
                      : c.current &&
                          same(x, c.current.name) &&
                          kind === "retailer"
                        ? "Header retailer"
                        : undefined,
                  }))}
                />
              </div>
              <span className="cmpx__vs" aria-hidden="true">
                vs
              </span>
              <div className="cmpx__field cmpx__field--grow">
                <span className="cmpx__label">
                  {c.right_label}
                  <small>{right.length} selected</small>
                </span>
                <MultiSelect
                  label={c.right_label}
                  values={pick.right.filter(
                    (x) => rightOptions.includes(x) && isOpen(x),
                  )}
                  onChange={(v) => setPick({ right: v })}
                  options={rightOptions}
                  disabled={rightOptions.filter((x) => !isOpen(x))}
                />
              </div>
            </div>

            <Strip count={1 + right.length}>
              {leftEntity && (
                <EntityCard
                  e={leftEntity}
                  base
                  role={roleOf(true)}
                  market={c.market}
                  dims={c.dimensions}
                  top={top}
                  color={colorOf(leftEntity.name, c.options)}
                  onOpen={(code) => pickDim(leftEntity, code)}
                  active={activeOn(leftEntity)}
                  openLabel={pickLabel}
                />
              )}
              {right.map((e) => (
                <EntityCard
                  key={e.name}
                  e={e}
                  vs={leftEntity}
                  role={roleOf(false)}
                  market={c.market}
                  dims={c.dimensions}
                  top={top}
                  color={colorOf(e.name, c.options)}
                  onOpen={(code) => pickDim(e, code)}
                  active={activeOn(e)}
                  openLabel={pickLabel}
                />
              ))}
              {right.length === 0 && (
                <div className="ecard ecard--empty">
                  <p>Pick at least one in “{c.right_label}” to compare.</p>
                </div>
              )}
            </Strip>

            {/* <p className="cmpx__note">
              <Info16Regular /> Badges show the difference from{" "}
              {leftEntity?.name ?? "the first card"}. Only retailers with a run
              in this market show measured levels; Static placeholder levels
              stand in until that data is loaded.
            </p> */}
          </div>
        )}
      </section>

      {/* The questions panel sits between the cards and the month-by-month chart */}
      {below}

      {c && leftEntity && (
        <MonthByMonth
          c={c}
          left={leftEntity}
          right={right}
          top={top}
          isOpen={isOpen}
        />
      )}

      <DimensionModal
        code={open?.code ?? null}
        onClose={() => setOpen(null)}
        account={
          open?.e.slug
            ? { retailer: open.e.slug, market: c?.market_code ?? f.market }
            : undefined
        }
        entity={open && !open.e.slug ? { kind, name: open.e.name } : undefined}
      />
    </>
  );
}

/** A row of equal cards that scrolls sideways when there are more than fit, with arrow buttons. */
function Strip({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [count]);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    const card = el?.querySelector<HTMLElement>(".ecard");
    if (el)
      el.scrollBy({
        left: dir * ((card?.offsetWidth ?? 300) + 16),
        behavior: "smooth",
      });
  };
  const scrolls = !(edge.start && edge.end);
  return (
    <div className={`strip ${scrolls ? "strip--scrolls" : ""}`}>
      {scrolls && (
        <div className="strip__nav">
          <span className="strip__hint">{count} cards · scroll to see all</span>
          <button
            type="button"
            className="icon-btn strip__btn"
            onClick={() => go(-1)}
            disabled={edge.start}
            aria-label="Scroll left"
          >
            <ChevronLeft20Regular />
          </button>
          <button
            type="button"
            className="icon-btn strip__btn"
            onClick={() => go(1)}
            disabled={edge.end}
            aria-label="Scroll right"
          >
            <ChevronRight20Regular />
          </button>
        </div>
      )}
      <div
        className="strip__track"
        ref={ref}
        tabIndex={0}
        aria-label="Comparison cards"
      >
        {children}
      </div>
    </div>
  );
}

function EntityCard({
  e,
  base,
  vs,
  role,
  market,
  dims,
  top,
  color,
  onOpen,
  active = null,
  openLabel = "Open the scorecard",
}: {
  e: Entity;
  base?: boolean;
  vs?: Entity;
  role: string;
  market: string;
  dims: { code: string; name: string }[];
  top: number;
  color: string;
  onOpen: (code: string) => void;
  /** The dimension selected on this card, highlighted */
  active?: string | null;
  /** What selecting a dimension does, for its tooltip and label */
  openLabel?: string;
}) {
  // Retailers use their slug's logo, vendors and partners their name's (public/apple.png, public/dell.png, …);
  // falls back to the initial tile when there is no logo file
  const key = (e.slug || e.name).toLowerCase().replace(/[^a-z0-9]/g, "");
  const logo = VENDOR_LOGO[key] ?? `/${key}.png`;
  const [noLogo, setNoLogo] = useState(false);
  useEffect(() => setNoLogo(false), [logo]);
  const { data: meta } = useMeta();
  const shortName = (code: string, name: string) =>
    meta?.dimensions.find((x) => x.code === code)?.short || name;
  const diff = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && b != null ? Math.round((a - b) * 100) / 100 : null;
  const od = vs ? diff(e.overall, vs.overall) : null;
  return (
    <article
      className={`ecard ${base ? "ecard--base" : ""}`}
      style={{ ["--ec" as string]: color }}
    >
      <header className="ecard__head">
        {!noLogo ? (
          <span className="ecard__logo">
            <img
              src={logo}
              alt=""
              className="brand-logo brand-logo-cmp"
              onError={() => setNoLogo(true)}
            />
          </span>
        ) : (
          <Mark name={e.name} color={color} />
        )}
        <div className="ecard__who">
          <h3 title={e.name}>{e.name}</h3>
          <p>
            {role} · {market}
          </p>
        </div>
      </header>

      <div className="ecard__overall">
        <div>
          <span className="ecard__caption">Overall</span>
          <span className="ecard__lv">{lvText(e.overall)}</span>
        </div>
        {od != null && <DiffBadge v={od} />}
      </div>
      <div className="ecard__meter" aria-hidden="true">
        <i
          style={{
            width: `${e.overall != null ? Math.min(100, (e.overall / top) * 100) : 0}%`,
          }}
        />
      </div>

      <ul className="ecard__dims">
        {dims.map((x) => {
          const v = e.scores[x.code];
          const d = vs ? diff(v, vs.scores[x.code]) : null;
          return (
            <li key={x.code}>
              <button
                type="button"
                className={`erow ${active === x.code ? "is-on" : ""}`}
                disabled={v == null}
                onClick={() => onOpen(x.code)}
                aria-pressed={active === x.code}
                style={{
                  ["--dc" as string]: DIM_COLOR[x.code],
                  ["--dt" as string]: DIM_TINT[x.code],
                }}
                title={`${x.name} · ${lvText(v)} · ${openLabel.toLowerCase()}`}
                aria-label={`${x.code} ${x.name}: ${e.name} ${lvText(v)}. ${openLabel}`}
              >
                <span className="erow__code">{x.code}</span>
                <span className="erow__name">{shortName(x.code, x.name)}</span>
                <span className="erow__val">{lvText(v)}</span>
                <span className="erow__bar">
                  <i
                    style={{
                      width: `${v != null && v >= 1 ? Math.min(100, (v / top) * 100) : 0}%`,
                    }}
                  />
                </span>
                <span className="erow__diff">
                  {d != null && <DiffBadge v={d} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function DiffBadge({ v }: { v: number }) {
  if (Math.abs(v) < 0.005) return <span className="dbadge">±0.00</span>;
  return (
    <span className={`dbadge ${v > 0 ? "is-up" : "is-down"}`}>
      {v > 0 ? "+" : "−"}
      {Math.abs(v).toFixed(2)}
    </span>
  );
}

/* ---------------------------------------------------------------- Month by month */
function MonthByMonth({
  c,
  left,
  right,
  top,
  isOpen,
}: {
  c: Cmp;
  left: Entity;
  right: Entity[];
  top: number;
  /** Whether an option can be picked; the rest are greyed out */
  isOpen: (name: string) => boolean;
}) {
  const dims = c.dimensions.map((x) => x.code);
  // "all" plots the overall score: the average of the dimensions, for months where every one has a value
  const [dim, setDim] = useState("all");
  const valuesOf = (e: Entity) =>
    dim !== "all"
      ? (e.trend[dim] ?? [])
      : c.months.map((_, i) => {
          const vs = dims.map((d) => e.trend[d]?.[i] ?? null);
          return vs.every((v) => v != null)
            ? (vs as number[]).reduce((a, b) => a + b, 0) / vs.length
            : null;
        });
  const options = c.options.filter((x) => !same(x, left.name));
  // Lines on the chart: preset to the picks above, more can be added here
  const key = right.map((e) => e.name).join("|");
  const [picked, setPicked] = useState<string[]>(right.map((e) => e.name));
  useEffect(() => setPicked(right.map((e) => e.name)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = options
    .filter((x) => picked.includes(x) && isOpen(x))
    .map((x) => c.entities.find((e) => e.name === x)!)
    .filter(Boolean);
  const series = [
    { name: left.name, color: "#242424", values: valuesOf(left) },
    ...shown.map((e) => ({
      name: e.name,
      color: colorOf(e.name, c.options),
      values: valuesOf(e),
    })),
  ];
  const dimName =
    dim === "all"
      ? "Overall score"
      : (c.dimensions.find((x) => x.code === dim)?.name ?? dim);
  const title =
    shown.length === 1
      ? `${left.name} vs ${shown[0].name}`
      : shown.length
        ? `${left.name} vs ${shown.length} others`
        : left.name;
  return (
    <Panel
      className="aa-row mom-panel"
      title={`Month by month · ${title}`}
      sub={`${dimName} in ${c.market}: AI readiness level for every month on file, out of ${top}. Hover the chart for each month’s values.`}
      actions={
        <div className="mom-actions">
          <MultiSelect
            label="Compare with"
            values={picked.filter(isOpen)}
            onChange={setPicked}
            options={options}
            disabled={options.filter((x) => !isOpen(x))}
          />
          <Segmented
            label="Dimension"
            value={dim}
            onChange={setDim}
            options={[
              { value: "all", label: "Overall" },
              ...dims.map((x) => ({ value: x, label: x })),
            ]}
          />
        </div>
      }
    >
      <LineChart
        labels={c.months.map((m) => fmtPeriod(m).split(" ")[0])}
        series={series}
        yMin={0}
        yMax={top}
        ticks={top + 1}
        format={(n) => n.toFixed(2)}
        tickFormat={(n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2))}
        height={260}
        dots
      />
    </Panel>
  );
}

/** Checkbox list in a dropdown, for picking several competitors at once. */
function MultiSelect({
  label,
  values,
  options,
  disabled = [],
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  /** Options shown greyed out that cannot be picked */
  disabled?: string[];
  onChange: (v: string[]) => void;
}) {
  const pickable = options.filter((x) => !disabled.includes(x));
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  const toggle = (x: string) => {
    if (disabled.includes(x)) return;
    onChange(
      values.includes(x) ? values.filter((y) => y !== x) : [...values, x],
    );
  };
  const all = values.length === pickable.length;
  const text =
    values.length === 0
      ? "None"
      : all && !disabled.length
        ? "All competitors"
        : options.filter((x) => values.includes(x)).join(", ");
  return (
    <div className="dd ms" ref={box}>
      <span className="dd__label">{label}</span>
      <button
        type="button"
        className="dd__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dd__value">{text}</span>
        <ChevronDown20Regular className={`dd__chev ${open ? "is-open" : ""}`} />
      </button>
      {open && (
        <ul
          className="dd__list ms__list"
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
        >
          <li className="ms__all">
            <button
              type="button"
              onClick={() => onChange(all ? [] : [...pickable])}
            >
              {all ? "Clear all" : "Select all"}
            </button>
          </li>
          {options.map((x) => {
            const on = values.includes(x);
            const off = disabled.includes(x);
            return (
              <li
                key={x}
                role="option"
                aria-selected={on}
                aria-disabled={off || undefined}
                title={off ? DISABLED_NOTE : undefined}
                className={`ms__opt ${on ? "is-on" : ""} ${off ? "is-off" : ""}`}
                tabIndex={off ? -1 : 0}
                onClick={() => toggle(x)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(x);
                  }
                }}
              >
                <span className="ms__box" aria-hidden="true">
                  {on && <Checkmark16Regular />}
                </span>
                <span
                  className="ms__dot"
                  style={{
                    background:
                      VENDOR_COLOR[x] ??
                      PALETTE[options.indexOf(x) % PALETTE.length],
                  }}
                  aria-hidden="true"
                />
                {x}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** ▲ / ▼ change badge (also used by the Score register). */
export function Delta({ v, digits = 1 }: { v: number; digits?: number }) {
  if (Math.abs(v) < 0.05) return <span className="delta">no change</span>;
  return (
    <span className={`delta ${v > 0 ? "is-up" : "is-down"}`}>
      {v > 0 ? "▲" : "▼"} {Math.abs(v).toFixed(digits)}
    </span>
  );
}
