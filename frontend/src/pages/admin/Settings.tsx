import {
  Add20Regular,
  Delete20Regular,
  Edit20Regular,
  Save20Regular,
} from "@fluentui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ConfirmDialog, useToast } from "../../components/feedback";
import { Query } from "../../components/Query";
import { PageHeader, Panel } from "../../components/ui";
import { getJSON, send } from "../../lib/api";
import { ROUTE_NAME, ratingOf } from "../../lib/constants";
import { GROUP_PILL, type Source } from "../overview/SourceRegister";

interface Retailer {
  slug: string;
  name: string;
  route: number;
  segment: string;
  hq: string;
  markets: { code: string; peers: string[] }[];
}
interface Market {
  code: string;
  name: string;
  currency: string;
  market_maker: number;
  strategic: number;
  used_by: string[];
}
interface Dim {
  code: string;
  name: string;
  short: string;
  color: string;
  summary: string;
  questions: number;
}
interface Level {
  level: number;
  name: string;
  stage: string;
  meaning: string;
  min_evidence: string;
  questions: number;
}
interface Fresh {
  evidence: string;
  window: string;
  action: string;
}
interface StateRow {
  name: string;
  tone: string;
  description: string;
}
interface Sku {
  code: string;
  name: string;
  position: number;
}
interface Data {
  retailers: Retailer[];
  markets: Market[];
  dimensions: Dim[];
  levels: Level[];
  scoring: {
    weights: Record<string, number>;
    threshold: number;
    infer: boolean;
  };
  freshness: Fresh[];
  evidence_states: StateRow[];
  skus: Sku[];
  sources: Source[];
}

const SECTIONS = [
  ["retailers", "Retailers"],
  ["countries", "Countries"],
  ["skus", "SKUs"],
  ["sources", "Sources"],
  ["dimensions", "Dimensions"],
  ["levels", "Levels and scoring"],
  ["freshness", "Freshness policy"],
  ["states", "Evidence states"],
] as const;

export default function Settings() {
  const q = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getJSON<Data>("/api/admin/settings"),
  });
  return (
    <>
      <PageHeader lede="Everything that shapes the assessment, on one page. Changes apply to every user straight away." />
      <nav className="sect-nav" aria-label="Settings sections">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById(id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <Query q={q}>{(d) => <View d={d} />}</Query>
    </>
  );
}

/** Shared mutation helper: toast, then refresh everything (meta, scores, settings). */
function useAct() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (a: {
      method: string;
      path: string;
      body?: unknown;
      ok: string;
    }) => send(a.method, a.path, a.body),
    onSuccess: (_r, a) => {
      toast("ok", a.ok);
      qc.invalidateQueries();
    },
    onError: (e) => toast("error", (e as Error).message),
  });
}

function View({ d }: { d: Data }) {
  const [confirm, setConfirm] = useState<{
    title: string;
    body: ReactNode;
    label: string;
    run: () => void;
  } | null>(null);
  const act = useAct();
  const ask = (
    title: string,
    body: ReactNode,
    label: string,
    run: () => void,
  ) => setConfirm({ title, body, label, run });
  return (
    <div className="settings">
      <Retailers d={d} act={act} ask={ask} />
      <Countries d={d} act={act} ask={ask} />
      <Skus d={d} act={act} ask={ask} />
      <Sources d={d} act={act} ask={ask} />
      <Dimensions d={d} act={act} ask={ask} />
      <Levels d={d} act={act} ask={ask} />
      <Freshness d={d} act={act} />
      <States d={d} act={act} />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        body={confirm?.body}
        confirmLabel={confirm?.label ?? ""}
        busy={act.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
      />
    </div>
  );
}

type Act = ReturnType<typeof useAct>;
type Ask = (
  title: string,
  body: ReactNode,
  label: string,
  run: () => void,
) => void;

function Section({
  id,
  title,
  sub,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="settings__sec">
      <Panel title={title} sub={sub}>
        {children}
      </Panel>
    </section>
  );
}

/* ---------------------------------------------------------------- Retailers */
function RetailerForm({
  d,
  init,
  onSubmit,
  onCancel,
  busy,
}: {
  d: Data;
  init?: Retailer;
  onSubmit: (b: object) => void;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(init?.name ?? "");
  const [route, setRoute] = useState(init?.route ?? 1);
  const [segment, setSegment] = useState(init?.segment ?? "Strategic");
  const [mk, setMk] = useState<string[]>(
    init?.markets.map((m) => m.code) ?? [],
  );
  const [peers, setPeers] = useState(init?.markets[0]?.peers.join(", ") ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      route,
      segment,
      markets: mk,
      peers: peers
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    });
  };
  return (
    <form className="sform" onSubmit={submit}>
      <div className="form-row">
        <label className="field">
          <span>Retailer name</span>
          <input
            className="input"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coolblue"
          />
        </label>
        <label className="field field--sm">
          <span>Route</span>
          <select
            className="select"
            value={route}
            onChange={(e) => setRoute(Number(e.target.value))}
          >
            {[1, 2, 3].map((r) => (
              <option key={r} value={r}>
                {ROUTE_NAME[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--sm">
          <span>Segment</span>
          <select
            className="select"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            <option>Market Maker</option>
            <option>Strategic</option>
          </select>
        </label>
      </div>
      <fieldset className="checks">
        <legend>Countries</legend>
        {d.markets.map((m) => (
          <label key={m.code} className="check">
            <input
              type="checkbox"
              checked={mk.includes(m.code)}
              onChange={(e) =>
                setMk(
                  e.target.checked
                    ? [...mk, m.code]
                    : mk.filter((x) => x !== m.code),
                )
              }
            />
            {m.name}
          </label>
        ))}
      </fieldset>
      {!init && (
        <label className="field">
          <span>
            Peer retailers <em>comma-separated, optional</em>
          </span>
          <input
            className="input"
            value={peers}
            onChange={(e) => setPeers(e.target.value)}
            placeholder="e.g. MediaMarkt NL, bol.com"
          />
        </label>
      )}
      <div className="sform__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !name.trim() || mk.length === 0}
        >
          {init ? (
            <>
              <Save20Regular />
              Save retailer
            </>
          ) : (
            <>
              <Add20Regular />
              Add retailer
            </>
          )}
        </button>
      </div>
      {!init && (
        <p className="muted sform__note">
          A new retailer starts with every question Check pending for each month
          on file, until the agent runs for it.
        </p>
      )}
    </form>
  );
}

function Retailers({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const name = (c: string) => d.markets.find((m) => m.code === c)?.name ?? c;
  return (
    <Section
      id="retailers"
      title="Retailers"
      sub={`${d.retailers.length} retailer accounts. Removing one deletes its assessments, evidence and score history.`}
    >
      <ul className="srows">
        {d.retailers.map((r) => (
          <li key={r.slug}>
            {edit === r.slug ? (
              <RetailerForm
                d={d}
                init={r}
                busy={act.isPending}
                onCancel={() => setEdit(null)}
                onSubmit={(b) =>
                  act.mutate(
                    {
                      method: "PUT",
                      path: `/api/admin/retailers/${r.slug}`,
                      body: b,
                      ok: `${r.name} saved.`,
                    },
                    { onSuccess: () => setEdit(null) },
                  )
                }
              />
            ) : (
              <div className="srow">
                <div className="srow__main">
                  <b>{r.name}</b>
                  <span className="muted">
                    {ROUTE_NAME[r.route]} · {r.segment}
                  </span>
                </div>
                <div className="chips-row">
                  {r.markets.map((m) => (
                    <span key={m.code} className="pill">
                      {name(m.code)}
                    </span>
                  ))}
                </div>
                <div className="srow__act">
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => setEdit(r.slug)}
                  >
                    <Edit20Regular />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle btn--danger-text"
                    onClick={() =>
                      ask(
                        `Remove ${r.name}?`,
                        <p>
                          This deletes {r.name} and all of its assessments,
                          evidence records and saved score versions. It cannot
                          be undone.
                        </p>,
                        "Remove retailer",
                        () =>
                          act.mutate({
                            method: "DELETE",
                            path: `/api/admin/retailers/${r.slug}`,
                            ok: `${r.name} removed.`,
                          }),
                      )
                    }
                  >
                    <Delete20Regular />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="sadd">
          <RetailerForm
            d={d}
            busy={act.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(b) =>
              act.mutate(
                {
                  method: "POST",
                  path: "/api/admin/retailers",
                  body: b,
                  ok: "Retailer added.",
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => setAdding(true)}
        >
          <Add20Regular />
          Add a retailer
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Countries */
function MarketForm({
  init,
  onSubmit,
  onCancel,
  busy,
}: {
  init?: Market;
  onSubmit: (b: object) => void;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [v, setV] = useState({
    code: init?.code ?? "",
    name: init?.name ?? "",
    currency: init?.currency ?? "",
    market_maker: init?.market_maker ?? 0,
    strategic: init?.strategic ?? 0,
  });
  return (
    <form
      className="sform"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="form-row">
        <label className="field field--xs">
          <span>Code</span>
          <input
            className="input"
            required
            pattern="[A-Za-z]{2,3}"
            maxLength={3}
            disabled={!!init}
            value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
            placeholder="NL"
          />
        </label>
        <label className="field">
          <span>Country</span>
          <input
            className="input"
            required
            minLength={2}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            placeholder="Netherlands"
          />
        </label>
        <label className="field field--xs">
          <span>Currency</span>
          <input
            className="input"
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            value={v.currency}
            onChange={(e) =>
              setV({ ...v, currency: e.target.value.toUpperCase() })
            }
            placeholder="EUR"
          />
        </label>
        <label className="field field--xs">
          <span>Market Maker</span>
          <input
            className="input"
            type="number"
            min={0}
            value={v.market_maker}
            onChange={(e) =>
              setV({ ...v, market_maker: Number(e.target.value) })
            }
          />
        </label>
        <label className="field field--xs">
          <span>Strategic</span>
          <input
            className="input"
            type="number"
            min={0}
            value={v.strategic}
            onChange={(e) => setV({ ...v, strategic: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="sform__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {init ? (
            <>
              <Save20Regular />
              Save country
            </>
          ) : (
            <>
              <Add20Regular />
              Add country
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Countries({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <Section
      id="countries"
      title="Countries"
      sub="Markets an account can be assessed in, with their DM8 account entries."
    >
      <ul className="srows">
        {d.markets.map((m) => (
          <li key={m.code}>
            {edit === m.code ? (
              <MarketForm
                init={m}
                busy={act.isPending}
                onCancel={() => setEdit(null)}
                onSubmit={(b) =>
                  act.mutate(
                    {
                      method: "PUT",
                      path: `/api/admin/markets/${m.code}`,
                      body: b,
                      ok: `${m.name} saved.`,
                    },
                    { onSuccess: () => setEdit(null) },
                  )
                }
              />
            ) : (
              <div className="srow">
                <div className="srow__main">
                  <b>
                    {m.name}{" "}
                    <span className="muted mono">
                      {m.code} · {m.currency}
                    </span>
                  </b>
                  <span className="muted">
                    {m.market_maker} Market Maker · {m.strategic} Strategic
                    entries
                  </span>
                </div>
                <div className="srow__used muted">
                  {m.used_by.length
                    ? `Used by ${m.used_by.join(", ")}`
                    : "No retailer yet"}
                </div>
                <div className="srow__act">
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => setEdit(m.code)}
                  >
                    <Edit20Regular />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle btn--danger-text"
                    onClick={() =>
                      ask(
                        `Remove ${m.name}?`,
                        <p>
                          {m.used_by.length
                            ? `Assessments for ${m.used_by.join(", ")} in ${m.name} are deleted too.`
                            : "No retailer uses it."}{" "}
                          A retailer must keep at least one country.
                        </p>,
                        "Remove country",
                        () =>
                          act.mutate({
                            method: "DELETE",
                            path: `/api/admin/markets/${m.code}`,
                            ok: `${m.name} removed.`,
                          }),
                      )
                    }
                  >
                    <Delete20Regular />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="sadd">
          <MarketForm
            busy={act.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(b) =>
              act.mutate(
                {
                  method: "POST",
                  path: "/api/admin/markets",
                  body: b,
                  ok: "Country added.",
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => setAdding(true)}
        >
          <Add20Regular />
          Add a country
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- SKUs */
function SkuForm({
  init,
  onSubmit,
  onCancel,
  busy,
}: {
  init?: Sku;
  onSubmit: (b: object) => void;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [v, setV] = useState({
    name: init?.name ?? "",
    position: init?.position ?? ("" as number | ""),
  });
  return (
    <form
      className="sform"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: v.name,
          ...(v.position === "" ? {} : { position: Number(v.position) }),
        });
      }}
    >
      <div className="form-row">
        <label className="field">
          <span>SKU name</span>
          <input
            className="input"
            required
            minLength={2}
            maxLength={80}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            placeholder="Surface devices"
            autoFocus
          />
        </label>
        <label className="field field--xs">
          <span>Order</span>
          <input
            className="input"
            type="number"
            min={0}
            value={v.position}
            onChange={(e) =>
              setV({
                ...v,
                position: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            placeholder="Last"
          />
        </label>
      </div>
      <div className="sform__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {init ? (
            <>
              <Save20Regular />
              Save SKU
            </>
          ) : (
            <>
              <Add20Regular />
              Add SKU
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Skus({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const last = d.skus.length <= 1;
  return (
    <Section
      id="skus"
      title="SKUs"
      sub="Product families in the header SKU dropdown, in this order. The first one is the default. At least one must stay."
    >
      <ul className="srows">
        {d.skus.map((s, i) => (
          <li key={s.code}>
            {edit === s.code ? (
              <SkuForm
                init={s}
                busy={act.isPending}
                onCancel={() => setEdit(null)}
                onSubmit={(b) =>
                  act.mutate(
                    {
                      method: "PUT",
                      path: `/api/admin/skus/${s.code}`,
                      body: b,
                      ok: "SKU saved.",
                    },
                    { onSuccess: () => setEdit(null) },
                  )
                }
              />
            ) : (
              <div className="srow">
                <div className="srow__main">
                  <b>
                    {s.name} <span className="muted mono">{s.code}</span>
                  </b>
                  <span className="muted">
                    Order {s.position}
                    {i === 0 ? " · default" : ""}
                  </span>
                </div>
                <div className="srow__used muted" />
                <div className="srow__act">
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => setEdit(s.code)}
                  >
                    <Edit20Regular />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle btn--danger-text"
                    disabled={last}
                    title={last ? "At least one SKU must stay" : undefined}
                    onClick={() =>
                      ask(
                        `Remove ${s.name}?`,
                        <p>
                          It disappears from the header SKU dropdown for
                          everyone.
                        </p>,
                        "Remove SKU",
                        () =>
                          act.mutate({
                            method: "DELETE",
                            path: `/api/admin/skus/${s.code}`,
                            ok: `${s.name} removed.`,
                          }),
                      )
                    }
                  >
                    <Delete20Regular />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="sadd">
          <SkuForm
            busy={act.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(b) =>
              act.mutate(
                {
                  method: "POST",
                  path: "/api/admin/skus",
                  body: b,
                  ok: "SKU added.",
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => setAdding(true)}
        >
          <Add20Regular />
          Add an SKU
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Sources */
const SOURCE_TYPES = [
  "Primary (company)",
  "Primary (company statement)",
  "Primary (filing)",
  "Primary (partner statement)",
  "Secondary (trade press)",
  "Secondary (press)",
  "Secondary (filing summary)",
  "Secondary (third-party)",
  "Secondary (low-authority blog)",
  "Vendor case study",
  "Direct observation",
];

function nextCode(rows: Source[]) {
  const n =
    rows.reduce(
      (mx, s) => Math.max(mx, Number(s.code.replace(/\D/g, "")) || 0),
      0,
    ) + 1;
  return `S${String(n).padStart(2, "0")}`;
}

function SourceForm({
  d,
  init,
  account,
  onSubmit,
  onCancel,
  busy,
}: {
  d: Data;
  init?: Source;
  account: string;
  onSubmit: (b: object) => void;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [acc, setAcc] = useState(
    init ? `${init.retailer}|${init.market}` : account,
  );
  const inAcc = d.sources.filter((s) => `${s.retailer}|${s.market}` === acc);
  const [v, setV] = useState({
    code: init?.code ?? nextCode(inAcc),
    title: init?.title ?? "",
    publisher: init?.publisher ?? "",
    date: init?.date ?? "",
    source_type: init?.source_type ?? "Secondary (trade press)",
    url: init?.url ?? "",
    used_for: init?.used_for ?? "",
    citing_rows: init?.citing_rows ?? 0,
  });
  const [dims, setDims] = useState<string[]>(init?.dimensions ?? []);
  const known = d.dimensions.map((x) => x.code);
  const extra = dims.filter((x) => !known.includes(x)); // e.g. D5 from an older log: kept as is
  const types = Array.from(
    new Set([
      ...SOURCE_TYPES,
      ...d.sources.map((s) => s.source_type).filter(Boolean),
    ]),
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [retailer, market] = acc.split("|");
    onSubmit({
      ...v,
      retailer,
      market,
      dimensions: dims,
      citing_rows: Number(v.citing_rows) || 0,
    });
  };
  return (
    <form className="sform" onSubmit={submit}>
      <div className="form-row">
        <label className="field field--sm">
          <span>Retailer · country</span>
          <select
            className="select"
            value={acc}
            onChange={(e) => setAcc(e.target.value)}
          >
            {d.retailers.flatMap((r) =>
              r.markets.map((m) => (
                <option
                  key={`${r.slug}|${m.code}`}
                  value={`${r.slug}|${m.code}`}
                >
                  {r.name} · {m.code}
                </option>
              )),
            )}
          </select>
        </label>
        <label className="field field--xs">
          <span>ID</span>
          <input
            className="input"
            required
            pattern="[A-Za-z]{1,3}[0-9]{1,4}"
            value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
            placeholder="S39"
          />
        </label>
        <label className="field field--grow">
          <span>Title</span>
          <input
            className="input"
            required
            minLength={2}
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            placeholder="Best Buy Q3 FY27 earnings call transcript"
            autoFocus={!init}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span>Publisher</span>
          <input
            className="input"
            value={v.publisher}
            onChange={(e) => setV({ ...v, publisher: e.target.value })}
            placeholder="Retail Dive"
          />
        </label>
        <label className="field field--sm">
          <span>Date</span>
          <input
            className="input"
            value={v.date}
            onChange={(e) => setV({ ...v, date: e.target.value })}
            placeholder="27 Aug 2026 or Undated"
          />
        </label>
        <label className="field field--sm">
          <span>Source type</span>
          <input
            className="input"
            list="source-types"
            value={v.source_type}
            onChange={(e) => setV({ ...v, source_type: e.target.value })}
          />
          <datalist id="source-types">
            {types.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="field">
        <span>Link</span>
        <input
          className="input"
          type="url"
          pattern="https?://.+"
          value={v.url}
          onChange={(e) => setV({ ...v, url: e.target.value })}
          placeholder="https://…"
        />
      </label>
      <fieldset className="checks">
        <legend>Dimensions</legend>
        {known.map((c) => (
          <label key={c} className="check">
            <input
              type="checkbox"
              checked={dims.includes(c)}
              onChange={(e) =>
                setDims(
                  e.target.checked ? [...dims, c] : dims.filter((x) => x !== c),
                )
              }
            />
            {c}
          </label>
        ))}
        {extra.map((c) => (
          <label
            key={c}
            className="check"
            title="Not a current dimension; kept from the source log"
          >
            <input
              type="checkbox"
              checked
              onChange={() => setDims(dims.filter((x) => x !== c))}
            />
            {c}
          </label>
        ))}
      </fieldset>
      <div className="form-row">
        <label className="field field--grow">
          <span>What we used it for</span>
          <textarea
            className="input"
            rows={2}
            value={v.used_for}
            onChange={(e) => setV({ ...v, used_for: e.target.value })}
          />
        </label>
        <label className="field field--xs">
          <span>Rows citing</span>
          <input
            className="input"
            type="number"
            min={0}
            value={v.citing_rows}
            onChange={(e) =>
              setV({ ...v, citing_rows: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <div className="sform__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !v.title.trim()}
        >
          {init ? (
            <>
              <Save20Regular />
              Save source
            </>
          ) : (
            <>
              <Add20Regular />
              Add source
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Sources({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const accounts = d.retailers.flatMap((r) =>
    r.markets.map((m) => ({
      key: `${r.slug}|${m.code}`,
      label: `${r.name} · ${m.code}`,
    })),
  );
  const [account, setAccount] = useState(
    accounts.find((a) =>
      d.sources.some((s) => `${s.retailer}|${s.market}` === a.key),
    )?.key ??
      accounts[0]?.key ??
      "",
  );
  const [edit, setEdit] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const rows = d.sources
    .filter((s) => `${s.retailer}|${s.market}` === account)
    .filter(
      (s) =>
        !q ||
        `${s.code} ${s.title} ${s.publisher}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (Number(a.code.replace(/\D/g, "")) || 0) -
        (Number(b.code.replace(/\D/g, "")) || 0),
    );
  const count = (key: string) =>
    d.sources.filter((s) => `${s.retailer}|${s.market}` === key).length;
  return (
    <Section
      id="sources"
      title="Sources"
      sub="The links consulted for each retailer and country run. They appear in Overview › Source register, and question results cite them by ID."
    >
      <div className="toolbar">
        <select
          className="select"
          value={account}
          onChange={(e) => {
            setAccount(e.target.value);
            setEdit(null);
            setAdding(false);
          }}
          aria-label="Retailer and country"
        >
          {accounts.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} ({count(a.key)})
            </option>
          ))}
        </select>
        <input
          className="input"
          type="search"
          placeholder="Search sources"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search sources"
          style={{ maxWidth: 260 }}
        />
        <span className="toolbar__count">{rows.length} sources</span>
      </div>
      <ul className="srows">
        {rows.map((s) => (
          <li key={s.id}>
            {edit === s.id ? (
              <SourceForm
                d={d}
                init={s}
                account={account}
                busy={act.isPending}
                onCancel={() => setEdit(null)}
                onSubmit={(b) =>
                  act.mutate(
                    {
                      method: "PUT",
                      path: `/api/admin/sources/${s.id}`,
                      body: b,
                      ok: `${s.code} saved.`,
                    },
                    { onSuccess: () => setEdit(null) },
                  )
                }
              />
            ) : (
              <div className="srow">
                <div className="srow__main">
                  <b>
                    <span className="muted mono">{s.code}</span> {s.title}
                  </b>
                  <span className="muted">
                    {s.publisher}
                    {s.date ? ` · ${s.date}` : ""}
                    {s.dimensions.length ? ` · ${s.dimensions.join(", ")}` : ""}
                  </span>
                </div>
                <div className="srow__used">
                  <span className={`pill ${GROUP_PILL[s.group] ?? ""}`}>
                    {s.source_type || "No type"}
                  </span>
                </div>
                <div className="srow__act">
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => {
                      setEdit(s.id);
                      setAdding(false);
                    }}
                  >
                    <Edit20Regular />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle btn--danger-text"
                    onClick={() =>
                      ask(
                        `Remove ${s.code}?`,
                        <p>
                          {s.title} is removed from the Source register.
                          Question results that cite {s.code} keep the ID.
                        </p>,
                        "Remove source",
                        () =>
                          act.mutate({
                            method: "DELETE",
                            path: `/api/admin/sources/${s.id}`,
                            ok: `${s.code} removed.`,
                          }),
                      )
                    }
                  >
                    <Delete20Regular />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="muted" style={{ padding: "12px 0" }}>
            No sources for this retailer and country yet.
          </li>
        )}
      </ul>
      {adding ? (
        <div className="sadd">
          <SourceForm
            d={d}
            account={account}
            busy={act.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(b) =>
              act.mutate(
                {
                  method: "POST",
                  path: "/api/admin/sources",
                  body: b,
                  ok: "Source added.",
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => {
            setAdding(true);
            setEdit(null);
          }}
        >
          <Add20Regular />
          Add a source
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Dimensions */
function DimForm({
  init,
  nextCode,
  onSubmit,
  onCancel,
  busy,
}: {
  init?: Dim;
  nextCode: string;
  onSubmit: (b: object) => void;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [v, setV] = useState({
    code: init?.code ?? nextCode,
    name: init?.name ?? "",
    short: init?.short ?? "",
    color: init?.color ?? "#008272",
    summary: init?.summary ?? "",
  });
  return (
    <form
      className="sform"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="form-row">
        <label className="field field--xs">
          <span>Code</span>
          <input
            className="input"
            required
            pattern="D[0-9]{1,2}"
            disabled={!!init}
            value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
          />
        </label>
        <label className="field">
          <span>Name</span>
          <input
            className="input"
            required
            minLength={2}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            placeholder="Trust & safety"
          />
        </label>
        <label className="field">
          <span>
            Short name <em>optional</em>
          </span>
          <input
            className="input"
            value={v.short}
            onChange={(e) => setV({ ...v, short: e.target.value })}
          />
        </label>
        <label className="field field--xs">
          <span>Colour</span>
          <input
            className="input input--color"
            type="color"
            value={v.color}
            onChange={(e) => setV({ ...v, color: e.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span>What it measures</span>
        <textarea
          className="input"
          rows={2}
          value={v.summary}
          onChange={(e) => setV({ ...v, summary: e.target.value })}
        />
      </label>
      <div className="sform__actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {init ? (
            <>
              <Save20Regular />
              Save dimension
            </>
          ) : (
            <>
              <Add20Regular />
              Add dimension
            </>
          )}
        </button>
      </div>
      {!init && (
        <p className="muted sform__note">
          A new dimension scores Not established until questions are added for
          it.
        </p>
      )}
    </form>
  );
}

function Dimensions({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const next = `D${Math.max(0, ...d.dimensions.map((x) => Number(x.code.slice(1)) || 0)) + 1}`;
  return (
    <Section
      id="dimensions"
      title="Dimensions"
      sub="A dimension that still has questions cannot be removed."
    >
      <ul className="srows">
        {d.dimensions.map((x) => (
          <li key={x.code}>
            {edit === x.code ? (
              <DimForm
                init={x}
                nextCode={next}
                busy={act.isPending}
                onCancel={() => setEdit(null)}
                onSubmit={(b) =>
                  act.mutate(
                    {
                      method: "PUT",
                      path: `/api/admin/dimensions/${x.code}`,
                      body: b,
                      ok: `${x.code} saved.`,
                    },
                    { onSuccess: () => setEdit(null) },
                  )
                }
              />
            ) : (
              <div className="srow">
                <div className="srow__main">
                  <b>
                    <i className="swatch" style={{ background: x.color }} />
                    {x.code} · {x.name}
                  </b>
                  <span className="muted">
                    {x.summary || "No description yet."}
                  </span>
                </div>
                <div className="srow__used muted">{x.questions} questions</div>
                <div className="srow__act">
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => setEdit(x.code)}
                  >
                    <Edit20Regular />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle btn--danger-text"
                    disabled={x.questions > 0}
                    title={
                      x.questions
                        ? "Questions still use this dimension"
                        : undefined
                    }
                    onClick={() =>
                      ask(
                        `Remove ${x.code}?`,
                        <p>{x.name} and its level definitions are removed.</p>,
                        "Remove dimension",
                        () =>
                          act.mutate({
                            method: "DELETE",
                            path: `/api/admin/dimensions/${x.code}`,
                            ok: `${x.code} removed.`,
                          }),
                      )
                    }
                  >
                    <Delete20Regular />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="sadd">
          <DimForm
            nextCode={next}
            busy={act.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(b) =>
              act.mutate(
                {
                  method: "POST",
                  path: "/api/admin/dimensions",
                  body: b,
                  ok: "Dimension added.",
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => setAdding(true)}
        >
          <Add20Regular />
          Add a dimension
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Levels and scoring */
function LevelRow({
  l,
  act,
  ask,
  isTop,
}: {
  l: Level;
  act: Act;
  ask: Ask;
  isTop: boolean;
}) {
  const [v, setV] = useState(l);
  useEffect(() => setV(l), [l]);
  const dirty = JSON.stringify(v) !== JSON.stringify(l);
  return (
    <li className="lvrow">
      <span className="lvrow__n">{l.level}</span>
      <div className="lvrow__fields">
        <div className="form-row">
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </label>
          <label className="field field--sm">
            <span>Stage</span>
            <select
              className="select"
              value={v.stage}
              onChange={(e) => setV({ ...v, stage: e.target.value })}
            >
              <option>Crawl</option>
              <option>Walk</option>
              <option>Run</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Meaning</span>
          <input
            className="input"
            value={v.meaning}
            onChange={(e) => setV({ ...v, meaning: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Least evidence that earns it</span>
          <input
            className="input"
            value={v.min_evidence}
            onChange={(e) => setV({ ...v, min_evidence: e.target.value })}
          />
        </label>
      </div>
      <div className="lvrow__act">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!dirty || act.isPending}
          onClick={() =>
            act.mutate({
              method: "PUT",
              path: `/api/admin/levels/${l.level}`,
              body: v,
              ok: `Level ${l.level} saved.`,
            })
          }
        >
          <Save20Regular />
          Save
        </button>
        {isTop && (
          <button
            type="button"
            className="btn btn--subtle btn--danger-text"
            disabled={l.questions > 0}
            title={
              l.questions
                ? `${l.questions} questions test this level`
                : undefined
            }
            onClick={() =>
              ask(
                `Remove Level ${l.level}?`,
                <p>Its definitions in every dimension are removed.</p>,
                "Remove level",
                () =>
                  act.mutate({
                    method: "DELETE",
                    path: `/api/admin/levels/${l.level}`,
                    ok: `Level ${l.level} removed.`,
                  }),
              )
            }
          >
            <Delete20Regular />
            Remove
          </button>
        )}
        <span className="muted lvrow__q">{l.questions} questions</span>
      </div>
    </li>
  );
}

function Levels({ d, act, ask }: { d: Data; act: Act; ask: Ask }) {
  const [w, setW] = useState(d.scoring.weights);
  const [t, setT] = useState(d.scoring.threshold);
  const [inf, setInf] = useState(d.scoring.infer);
  useEffect(() => {
    setW(d.scoring.weights);
    setT(d.scoring.threshold);
    setInf(d.scoring.infer);
  }, [d.scoring]);
  const top = Math.max(...d.levels.map((l) => l.level));
  const [adding, setAdding] = useState(false);
  const [nl, setNl] = useState({
    name: "",
    stage: "Run",
    meaning: "",
    min_evidence: "",
  });
  const dirty =
    t !== d.scoring.threshold ||
    inf !== d.scoring.infer ||
    Object.keys(w).some((k) => w[k] !== d.scoring.weights[k]);
  return (
    <Section
      id="levels"
      title="Levels and scoring"
      sub="Level definitions, the weight each status carries, and the threshold a level must reach to be met."
    >
      <div className="scoring">
        <h3 className="settings__h">Scoring</h3>
        <div className="scoring__grid">
          {(["Yes", "Partial", "Issue", "No", "Not disclosed"] as const).map(
            (k) => (
              <label
                key={k}
                className="field field--xs"
                title={`C5i status ${k}, shown as ${ratingOf(k).label}`}
              >
                <span>
                  {ratingOf(k).label} <small className="muted">· {k}</small>
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={w[k]}
                  onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
                />
              </label>
            ),
          )}
          <label className="field field--xs">
            <span>Threshold %</span>
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={t}
              onChange={(e) => setT(Number(e.target.value))}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={inf}
            onChange={(e) => setInf(e.target.checked)}
          />
          Treat a level with no questions as met when a tested level above it is
          met
        </label>
        <div className="sform__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!dirty || act.isPending}
            onClick={() =>
              act.mutate({
                method: "PUT",
                path: "/api/admin/scoring",
                body: { weights: w, threshold: t, infer: inf },
                ok: "Scoring saved. Scores are recalculated for everyone.",
              })
            }
          >
            <Save20Regular />
            Save scoring
          </button>
        </div>
      </div>
      <h3 className="settings__h">Levels</h3>
      <ol className="lvrows">
        {d.levels.map((l) => (
          <LevelRow
            key={l.level}
            l={l}
            act={act}
            ask={ask}
            isTop={l.level === top}
          />
        ))}
      </ol>
      {adding ? (
        <form
          className="sadd sform"
          onSubmit={(e) => {
            e.preventDefault();
            act.mutate(
              {
                method: "POST",
                path: "/api/admin/levels",
                body: { level: top + 1, ...nl },
                ok: `Level ${top + 1} added.`,
              },
              {
                onSuccess: () => {
                  setAdding(false);
                  setNl({
                    name: "",
                    stage: "Run",
                    meaning: "",
                    min_evidence: "",
                  });
                },
              },
            );
          }}
        >
          <div className="form-row">
            <label className="field field--xs">
              <span>Level</span>
              <input className="input" value={top + 1} disabled />
            </label>
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                required
                minLength={2}
                value={nl.name}
                onChange={(e) => setNl({ ...nl, name: e.target.value })}
              />
            </label>
            <label className="field field--sm">
              <span>Stage</span>
              <select
                className="select"
                value={nl.stage}
                onChange={(e) => setNl({ ...nl, stage: e.target.value })}
              >
                <option>Crawl</option>
                <option>Walk</option>
                <option>Run</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Meaning</span>
            <input
              className="input"
              value={nl.meaning}
              onChange={(e) => setNl({ ...nl, meaning: e.target.value })}
            />
          </label>
          <div className="sform__actions">
            <button
              type="button"
              className="btn"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              <Add20Regular />
              Add level
            </button>
          </div>
          <p className="muted sform__note">
            A new top level is a ceiling until questions test it.
          </p>
        </form>
      ) : (
        <button
          type="button"
          className="btn sadd__btn"
          onClick={() => setAdding(true)}
        >
          <Add20Regular />
          Add Level {top + 1}
        </button>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Editable lists */
function ListEditor<T extends Record<string, string>>({
  rows,
  blank,
  cols,
  onSave,
  busy,
  addLabel,
}: {
  rows: T[];
  blank: T;
  cols: {
    key: keyof T;
    label: string;
    kind?: "text" | "tone" | "long";
    width?: string;
  }[];
  onSave: (rows: T[]) => void;
  busy: boolean;
  addLabel: string;
}) {
  const [v, setV] = useState(rows);
  useEffect(() => setV(rows), [rows]);
  const dirty = JSON.stringify(v) !== JSON.stringify(rows);
  const set = (i: number, k: keyof T, val: string) =>
    setV(v.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  return (
    <>
      <ul className="lrows">
        {v.map((r, i) => (
          <li key={i} className="lrow">
            {cols.map((c) => (
              <label
                key={String(c.key)}
                className={`field ${c.kind === "long" ? "field--grow" : ""}`}
                style={c.width ? { flexBasis: c.width } : undefined}
              >
                <span>{c.label}</span>
                {c.kind === "tone" ? (
                  <select
                    className="select"
                    value={r[c.key]}
                    onChange={(e) => set(i, c.key, e.target.value)}
                  >
                    <option value="good">Good</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="neutral">Neutral</option>
                  </select>
                ) : (
                  <input
                    className="input"
                    value={r[c.key]}
                    onChange={(e) => set(i, c.key, e.target.value)}
                  />
                )}
              </label>
            ))}
            <button
              type="button"
              className="icon-btn lrow__del"
              aria-label="Remove row"
              onClick={() => setV(v.filter((_, j) => j !== i))}
            >
              <Delete20Regular />
            </button>
          </li>
        ))}
      </ul>
      <div className="sform__actions sform__actions--split">
        <button
          type="button"
          className="btn"
          onClick={() => setV([...v, { ...blank }])}
        >
          <Add20Regular />
          {addLabel}
        </button>
        <span>
          {dirty && (
            <button type="button" className="btn" onClick={() => setV(rows)}>
              Discard changes
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            disabled={
              !dirty ||
              busy ||
              v.some((r) =>
                cols.some(
                  (c) =>
                    c.kind !== "tone" && c.kind !== "long" && !r[c.key].trim(),
                ),
              )
            }
            onClick={() => onSave(v)}
          >
            <Save20Regular />
            Save list
          </button>
        </span>
      </div>
    </>
  );
}

function Freshness({ d, act }: { d: Data; act: Act }) {
  return (
    <Section
      id="freshness"
      title="Freshness policy"
      sub="How old each kind of evidence may be before it is refreshed or marked H."
    >
      <ListEditor
        rows={d.freshness as unknown as Record<string, string>[]}
        blank={{ evidence: "", window: "", action: "" }}
        busy={act.isPending}
        addLabel="Add a rule"
        cols={[
          { key: "evidence", label: "Evidence", width: "30%" },
          { key: "window", label: "Window", width: "120px" },
          { key: "action", label: "Action", kind: "long" },
        ]}
        onSave={(rows) =>
          act.mutate({
            method: "PUT",
            path: "/api/admin/freshness",
            body: rows,
            ok: "Freshness policy saved.",
          })
        }
      />
    </Section>
  );
}

function States({ d, act }: { d: Data; act: Act }) {
  return (
    <Section
      id="states"
      title="Evidence states"
      sub="The states an evidence record can be in, shown in the Evidence register."
    >
      <ListEditor
        rows={d.evidence_states as unknown as Record<string, string>[]}
        blank={{ name: "", tone: "neutral", description: "" }}
        busy={act.isPending}
        addLabel="Add a state"
        cols={[
          { key: "name", label: "State", width: "200px" },
          { key: "tone", label: "Tone", kind: "tone", width: "130px" },
          { key: "description", label: "What it means", kind: "long" },
        ]}
        onSave={(rows) =>
          act.mutate({
            method: "PUT",
            path: "/api/admin/evidence-states",
            body: rows,
            ok: "Evidence states saved.",
          })
        }
      />
    </Section>
  );
}
