import { Checkmark20Regular, Save16Regular } from "@fluentui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { useToast } from "../../components/feedback";
import { useEffect, useState } from "react";
import { Query } from "../../components/Query";
import {
  DemoNotice,
  PageHeader,
  Panel,
  RatingChip,
  Segmented,
} from "../../components/ui";
import { send, useScoped, type Info } from "../../lib/api";
import { fmtDate, type RatingId } from "../../lib/constants";
import { useFilters } from "../../lib/filters";

interface Action {
  id: number;
  kind: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  cell: string | null;
  owner: string;
  reviewer: string;
  due: string | null;
  status: string;
  qids: string[];
  /** Rating the action comes from, and for agency fixes the plan an admin sets */
  rating?: RatingId;
  c5i_status?: string;
  effort?: string;
  editable?: boolean;
  link?: string;
}
const EFFORT: Record<string, string> = {
  S: "S · under a day",
  M: "M · 1–5 days",
  L: "L · over 5 days",
};
interface Data {
  info: Info;
  actions: Action[];
}

export default function NextActions() {
  const q = useScoped<Data>("/api/actions/next-actions");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

/** Ticking an action off is a personal reminder kept in this browser only. */
function useDone(key: string) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      setDone({});
    }
  }, [key]);
  const toggle = (id: string) =>
    setDone((d) => {
      const n = { ...d, [id]: !d[id] };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* storage unavailable */
      }
      return n;
    });
  return [done, toggle] as const;
}

function View({ d }: { d: Data }) {
  const [pri, setPri] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [done, toggle] = useDone(`next-actions:${d.info.id}`);
  const list = d.actions.filter((a) => pri === "all" || a.priority === pri);
  const kinds = [...new Set(d.actions.map((a) => a.kind))];
  const count = (p: string) => d.actions.filter((a) => a.priority === p).length;

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <div className="statline statline--3">
        <div>
          <span className="big-num pri-high">{count("High")}</span>
          <span>high priority</span>
        </div>
        <div>
          <span className="big-num">{count("Medium")}</span>
          <span>medium</span>
        </div>
        <div>
          <span className="big-num">{count("Low")}</span>
          <span>low · next-level goals</span>
        </div>
      </div>

      <Panel
        className="aa-row"
        title="Action list"
        sub={`${kinds.join(" · ")}. Tick an item to mark it done on this device.`}
        actions={
          <Segmented
            label="Priority"
            value={pri}
            onChange={setPri}
            options={[
              { value: "all", label: "All" },
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Low", label: "Low" },
            ]}
          />
        }
      >
        <ul className="actions">
          {list.map((a) => {
            const isDone = !!done[`${a.kind}:${a.title}`];
            return (
              <li key={a.id} className={`action ${isDone ? "is-done" : ""}`}>
                <button
                  type="button"
                  className="action__check"
                  aria-pressed={isDone}
                  aria-label={isDone ? "Mark as not done" : "Mark as done"}
                  onClick={() => toggle(`${a.kind}:${a.title}`)}
                >
                  {isDone && <Checkmark20Regular />}
                </button>
                <div className="action__body">
                  <div className="action__top">
                    <span className={`pri pri--${a.priority.toLowerCase()}`}>
                      {a.priority}
                    </span>
                    <span className="pill">{a.kind}</span>
                    {a.rating && <RatingChip rating={a.rating} size="sm" />}
                    {a.cell && <code className="cap__cell">{a.cell}</code>}
                  </div>
                  <p className="action__title">{a.title}</p>
                  <p className="action__detail">{a.detail}</p>
                  {a.qids.length > 0 && (
                    <div className="flag__qs">
                      {a.qids.slice(0, 10).map((q) => (
                        <span key={q} className="qid-chip">
                          {q}
                        </span>
                      ))}
                      {a.qids.length > 10 && (
                        <span className="muted">
                          +{a.qids.length - 10} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {a.editable ? (
                  <PlanEditor a={a} />
                ) : (
                  <dl className="action__meta">
                    <div>
                      <dt>Owner</dt>
                      <dd>{a.owner}</dd>
                    </div>
                    <div>
                      <dt>Reviewer</dt>
                      <dd>{a.reviewer}</dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>{a.due ? fmtDate(a.due) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {a.link ? (
                          <ActionLink to={a.link}>{a.status}</ActionLink>
                        ) : (
                          a.status
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

function ActionLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const { search } = useLocation();
  return <Link to={{ pathname: to, search }}>{children}</Link>;
}

/** Owner, effort and status of an agency fix; saved for this retailer and country. */
function PlanEditor({ a }: { a: Action }) {
  const { retailer, market } = useFilters();
  const qc = useQueryClient();
  const toast = useToast();
  const [owner, setOwner] = useState(a.owner);
  const [effort, setEffort] = useState(a.effort ?? "");
  const [status, setStatus] = useState(a.status);
  const dirty =
    owner !== a.owner || effort !== (a.effort ?? "") || status !== a.status;
  const save = useMutation({
    mutationFn: () =>
      send("PUT", "/api/admin/action-plan", {
        retailer,
        market,
        qid: a.qids[0],
        owner,
        effort,
        status,
      }),
    onSuccess: () => {
      toast("ok", `${a.qids[0]}: plan saved.`);
      qc.invalidateQueries({ queryKey: ["/api/actions/next-actions"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });
  return (
    <form
      className="action__plan"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="field">
        <span>Owner</span>
        <input
          className="input"
          placeholder="Agency team or person"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Effort</span>
        <select
          className="select"
          value={effort}
          onChange={(e) => setEffort(e.target.value)}
        >
          <option value="">Not estimated</option>
          {Object.entries(EFFORT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Status</span>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Open</option>
          <option>In progress</option>
          <option>Done</option>
        </select>
      </label>
      <button type="submit" className="btn" disabled={!dirty || save.isPending}>
        <Save16Regular />
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
