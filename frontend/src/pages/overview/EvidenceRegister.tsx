import { Search20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'
import { Query } from '../../components/Query'
import { DemoNotice, Drawer, Empty, PageHeader, Panel, Sources } from '../../components/ui'
import { useScoped, type Info } from '../../lib/api'
import { DIM_COLOR, fmtDate } from '../../lib/constants'

export interface Evidence {
  id: number; eid: string; title: string; claim: string; publisher: string; url: string; pub_date: string; observed: string
  channel: string; category: string; use_case: string; stage: string; independence: string; cell: string; rationale: string
  limits: string[]; source_type: string; confidence: string; result: string; h_flag: boolean; register_status: string
  register_note: string; freshness: string; change: string; val_owner: string; val_proof: string; val_due: string
  val_reviewer: string; val_disposition: string; next_level: string; questions: string[]; sources: string[]
  v1: { status: string; note: string; confidence: string; freshness: string } | null
  requires_review: boolean; approval: string; reviewed_by: string | null; reviewed_at: string | null; review_comment: string | null
  history: { at: string; by: string; decision: string; comment: string }[]
}
interface State { name: string; tone: string; description: string }
interface Data { info: Info; records: Evidence[]; states: State[]; summary: { total: number; by_status: Record<string, number>; pending: number; approved: number; h: number } }

const TONE: Record<string, string> = { good: 'pill--green', warning: 'pill--amber', critical: 'pill--red', neutral: '' }
const APPROVAL: Record<string, string> = { Approved: 'pill--green', 'Pending review': 'pill--blue', Rejected: 'pill--red', 'Changes requested': 'pill--amber' }
const RESULT: Record<string, string> = { Pass: 'pill--green', Issue: 'pill--red', Fail: 'pill--red', Unknown: '' }

export default function EvidenceRegister() {
  const q = useScoped<Data>('/api/evidence-register')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

export function StatePill({ name, states }: { name: string; states: State[] }) {
  const s = states.find((x) => x.name === name)
  return <span className={`pill ${TONE[s?.tone ?? 'neutral']}`} title={s?.description}>{name}</span>
}

function View({ d }: { d: Data }) {
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [open, setOpen] = useState<Evidence | null>(null)
  const rows = useMemo(() => d.records.filter((r) => (!st || r.register_status === st) && (!q || `${r.eid} ${r.title} ${r.claim} ${r.cell}`.toLowerCase().includes(q.toLowerCase()))), [d, q, st])

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />
      <div className="statline">
        <div><span className="big-num">{d.summary.total}</span><span>evidence records</span></div>
        <div><span className="big-num">{d.summary.by_status['Accepted'] ?? 0}</span><span>accepted at validation</span></div>
        <div><span className="big-num">{d.summary.pending}</span><span>waiting for manual review</span></div>
        <div><span className="big-num">{d.summary.h}</span><span>older than 12 months (H)</span></div>
      </div>

      <Panel className="aa-row" title="Evidence states" sub="What each register state means. Admins edit this list in Settings.">
        <ul className="states">
          {d.states.map((s) => (
            <li key={s.name}><StatePill name={s.name} states={d.states} /><span>{s.description}</span>{d.summary.by_status[s.name] ? <b>{d.summary.by_status[s.name]}</b> : null}</li>
          ))}
        </ul>
      </Panel>

      <Panel className="aa-row" title="Register">
        {d.records.length === 0 ? <Empty title="No evidence records for this account and month yet.">They appear here after the agent's Data node fetches evidence.</Empty> : (
          <>
            <div className="toolbar">
              <label className="search"><Search20Regular /><input type="search" placeholder="Search records" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search records" /></label>
              <select className="select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Register state">
                <option value="">All states</option>
                {d.states.map((s) => <option key={s.name}>{s.name}</option>)}
              </select>
              <span className="toolbar__count">{rows.length} of {d.records.length}</span>
            </div>
            <div className="table-wrap qt-wide">
              <table className="table">
                <thead><tr><th>Record</th><th>Claim</th><th>Cell</th><th>Stage</th><th>Result</th><th>Confidence</th><th>Register state</th><th>Review</th><th>Freshness</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="is-click" tabIndex={0} onClick={() => setOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r) }}>
                      <td className="qid">{r.eid}</td>
                      <td className="q">{r.title}<small className="cell-note">{r.claim}</small></td>
                      <td className="nowrap"><b style={{ color: DIM_COLOR[r.cell.split('-')[0]] }}>{r.cell}</b></td>
                      <td>{r.stage}</td>
                      <td><span className={`pill ${RESULT[r.result] ?? ''}`}>{r.result}</span>{r.h_flag && <span className="h-flag">H</span>}</td>
                      <td>{r.confidence}</td>
                      <td><StatePill name={r.register_status} states={d.states} />{r.v1 && r.v1.status !== r.register_status && <small className="cell-note">v1 {r.v1.status}</small>}</td>
                      <td><span className={`pill ${APPROVAL[r.approval] ?? ''}`}>{r.approval}</span></td>
                      <td className="wrap-sm">{r.freshness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="rows qt-narrow">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" className="qt-card" onClick={() => setOpen(r)}>
                    <span className="qt-card__top"><span className="qid-inline">{r.eid}</span><b style={{ color: DIM_COLOR[r.cell.split('-')[0]] }}>{r.cell}</b><StatePill name={r.register_status} states={d.states} /><span className={`pill ${APPROVAL[r.approval] ?? ''}`}>{r.approval}</span></span>
                    <span className="qt-card__q">{r.title}</span>
                    <span className="qt-card__f">{r.claim}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open && <><span className="qid-inline">{open.eid} · {open.cell}</span><h2 className="drawer__h">{open.title}</h2></>}>
        {open && <EvidenceDetail r={open} states={d.states} retailer={d.info.retailer.name} market={d.info.market.name} />}
      </Drawer>
    </>
  )
}

/** All seven required fields of an evidence record, plus its review history. */
export function EvidenceDetail({ r, states, retailer, market }: { r: Evidence; states: State[]; retailer: string; market: string }) {
  return (
    <div className="qd">
      <div className="qd__chips">
        <StatePill name={r.register_status} states={states} />
        <span className={`pill ${APPROVAL[r.approval] ?? ''}`}>{r.approval}</span>
        <span className="pill">{r.confidence} confidence</span>
        {r.h_flag && <span className="h-flag" style={{ marginLeft: 0 }}>H</span>}
      </div>
      <dl className="dl">
        <dt>Evidence identity</dt><dd>{r.eid} · {r.url}<br /><span className="muted">Publisher {r.publisher} · published {r.pub_date} · observed {fmtDate(r.observed)}</span></dd>
        <dt>Claim and scope</dt><dd>{r.claim}<br /><span className="muted">{retailer} · {market} · {r.channel} · {r.category} · {r.use_case}</span></dd>
        <dt>Stage</dt><dd>{r.stage}</dd>
        <dt>Independence</dt><dd>{r.independence}</dd>
        <dt>Assessment link</dt><dd>{r.cell} · {r.register_status}<br /><span className="muted">{r.rationale}</span>{r.questions.length > 0 && <div className="flag__qs">{r.questions.map((q) => <span key={q} className="qid-chip">{q}</span>)}</div>}</dd>
        <dt>Limitations</dt><dd><ul className="notes">{r.limits.map((l) => <li key={l}>{l}</li>)}</ul></dd>
        <dt>Validation</dt><dd>Owner {r.val_owner} · reviewer {r.val_reviewer} · due {fmtDate(r.val_due)}<br /><span className="muted">Requested proof: {r.val_proof}. Disposition: {r.val_disposition}.</span></dd>
        <dt>Freshness</dt><dd>{r.freshness}</dd>
        <dt>Sources</dt><dd><Sources ids={r.sources} /></dd>
        {r.v1 && <><dt>Version 1</dt><dd>{r.v1.status} · {r.v1.note} · {r.v1.confidence} · {r.v1.freshness}</dd></>}
        <dt>Next level</dt><dd>{r.next_level}</dd>
      </dl>
      {r.history.length > 0 && (
        <section>
          <p className="kicker">Review history</p>
          <ol className="history">
            {r.history.map((h, i) => (
              <li key={i}><b>{h.decision}</b> by {h.by} · {fmtDate(h.at.slice(0, 10))}{h.comment && <p className="muted">{h.comment}</p>}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
