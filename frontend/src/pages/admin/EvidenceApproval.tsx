import {
  Checkmark20Regular,
  Dismiss20Regular,
  ArrowUndo20Regular,
} from "@fluentui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "../../components/feedback";
import { Query } from "../../components/Query";
import {
  Drawer,
  Empty,
  PageHeader,
  Panel,
  Segmented,
  Tabs,
} from "../../components/ui";
import { getJSON, send } from "../../lib/api";
import { DIM_COLOR, fmtDate, fmtPeriod } from "../../lib/constants";
import { useFilters } from "../../lib/filters";
import { EvidenceDetail, type Evidence } from "../overview/EvidenceRegister";

type Rec = Evidence & {
  retailer: string;
  retailer_slug: string;
  market: string;
  market_code: string;
  period: string;
  data_source: string;
};
interface Data {
  records: Rec[];
  counts: Record<string, number>;
}
type Decision = "Approved" | "Rejected" | "Changes requested";
const TABS = [
  "Pending review",
  "Changes requested",
  "Rejected",
  "Approved",
] as const;

export default function EvidenceApproval() {
  const { retailer, market, period, sku } = useFilters();
  const [scope, setScope] = useState<"all" | "current">("all");
  const qs = new URLSearchParams(
    scope === "all" ? { scope } : { scope, retailer, market, period, sku },
  );
  const q = useQuery({
    queryKey: ["approvals", scope, retailer, market, period, sku],
    queryFn: () => getJSON<Data>(`/api/admin/evidence-approvals?${qs}`),
    placeholderData: (p) => p,
  });
  return (
    <>
      <PageHeader
        actions={
          <Segmented
            label="Which accounts"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "All accounts" },
              { value: "current", label: "Header selection" },
            ]}
          />
        }
      />
      <Query q={q}>{(d) => <View d={d} />}</Query>
    </>
  );
}

function View({ d }: { d: Data }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending review");
  const [open, setOpen] = useState<Rec | null>(null);
  const list = d.records.filter((r) => r.approval === tab);
  return (
    <>
      <p className="lede-line">
        Product evidence that validation did not accept outright needs a person
        to approve it. Approving marks it Human-verified so it counts toward its
        cell; rejecting marks it Rejected for cell.
      </p>
      <Panel actions={null}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={TABS.map((t) => ({
            value: t,
            label: `${t} · ${d.counts[t] ?? 0}`,
          }))}
        />
        {list.length === 0 ? (
          <Empty
            title={
              tab === "Pending review"
                ? "Nothing is waiting for review."
                : `No records are ${tab.toLowerCase()}.`
            }
          />
        ) : (
          <ul className="approvals">
            {list.map((r) => (
              <Card key={r.id} r={r} onOpen={() => setOpen(r)} />
            ))}
          </ul>
        )}
      </Panel>
      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={
          open && (
            <>
              <span className="qid-inline">
                {open.eid} · {open.retailer} · {open.market}
              </span>
              <h2 className="drawer__h">{open.title}</h2>
            </>
          )
        }
      >
        {open && (
          <EvidenceDetail
            r={open}
            states={[]}
            retailer={open.retailer}
            market={open.market}
          />
        )}
      </Drawer>
    </>
  );
}

function Card({ r, onOpen }: { r: Rec; onOpen: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [mode, setMode] = useState<Decision | null>(null);
  const [comment, setComment] = useState("");
  const decide = useMutation({
    mutationFn: (decision: Decision) =>
      send("POST", `/api/admin/evidence/${r.id}/decision`, {
        decision,
        comment,
      }),
    onSuccess: (_x, decision) => {
      toast("ok", `${r.eid} · ${r.retailer}: ${decision.toLowerCase()}.`);
      setMode(null);
      setComment("");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["/api/evidence-register"] });
      qc.invalidateQueries({ queryKey: ["/api/score-register"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });
  const pending =
    r.approval === "Pending review" || r.approval === "Changes requested";
  const dim = r.cell.split("-")[0];

  return (
    <li className="appr" style={{ ["--dc" as string]: DIM_COLOR[dim] }}>
      <div className="appr__meta">
        <span className="appr__where">
          <b>{r.retailer}</b> · {r.market} · {fmtPeriod(r.period)}
        </span>
        <code className="cap__cell">
          {r.eid} · {r.cell}
        </code>
      </div>
      <h3 className="appr__title">{r.title}</h3>
      <p className="appr__claim">{r.claim}</p>
      <div className="appr__facts">
        <span>
          <em>Result</em>
          {r.result}
        </span>
        <span>
          <em>Register state</em>
          {r.register_status}
        </span>
        <span>
          <em>Confidence</em>
          {r.confidence}
        </span>
        <span>
          <em>Requested proof</em>
          {r.val_proof}
        </span>
        <span>
          <em>Due</em>
          {fmtDate(r.val_due)}
        </span>
      </div>
      {r.limits.length > 0 && (
        <p className="appr__limit">Limit: {r.limits.join(" ")}</p>
      )}
      {r.history.length > 0 && (
        <p className="appr__last">
          Last: {r.history[r.history.length - 1].decision} by{" "}
          {r.history[r.history.length - 1].by}
          {r.review_comment ? ` — “${r.review_comment}”` : ""}
        </p>
      )}

      {mode && mode !== "Approved" && (
        <label className="field appr__comment">
          <span>
            {mode === "Rejected" ? "Why is it rejected?" : "What is needed?"}
          </span>
          <textarea
            className="input"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              mode === "Rejected"
                ? "e.g. A plan, not live use"
                : "e.g. Fetch 4 more SKUs with timestamps"
            }
            autoFocus
          />
        </label>
      )}
      <div className="appr__actions">
        <button type="button" className="btn btn--subtle" onClick={onOpen}>
          View all fields
        </button>
        {pending && !mode && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setMode("Changes requested")}
            >
              <ArrowUndo20Regular />
              Request changes
            </button>
            <button
              type="button"
              className="btn btn--danger-outline"
              onClick={() => setMode("Rejected")}
            >
              <Dismiss20Regular />
              Reject
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={decide.isPending}
              onClick={() => decide.mutate("Approved")}
            >
              <Checkmark20Regular />
              Approve
            </button>
          </>
        )}
        {mode && mode !== "Approved" && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMode(null);
                setComment("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${mode === "Rejected" ? "btn--danger" : "btn--primary"}`}
              disabled={!comment.trim() || decide.isPending}
              onClick={() => decide.mutate(mode)}
            >
              {mode === "Rejected" ? "Reject evidence" : "Send back"}
            </button>
          </>
        )}
        {!pending && (
          <span className="muted appr__done">
            {r.approval} by {r.reviewed_by}
            {r.reviewed_at ? ` · ${fmtDate(r.reviewed_at.slice(0, 10))}` : ""}
          </span>
        )}
      </div>
    </li>
  );
}
