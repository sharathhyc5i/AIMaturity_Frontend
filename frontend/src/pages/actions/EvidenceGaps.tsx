import { Link, useLocation } from 'react-router-dom'
import { Filled } from '../../components/QuestionTable'
import { ArrowLeft16Regular, ErrorCircle20Regular, Info20Regular, Warning20Regular } from '@fluentui/react-icons'
import { Query } from '../../components/Query'
import { Bar, DemoNotice, PageHeader, Panel, StatusChip } from '../../components/ui'
import { useScoped, type DimCode, type Info } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'

interface Data {
  info: Info
  flags: { area: string; kind: string; severity: 'error' | 'warn' | 'info'; text: string; questions: { qid: string; text: string }[] }[]
  queue: { dimension: DimCode; level: number; cell: string; name: string; score: string; testable: boolean; pct: number | null; threshold: number; requirement: string; missing: { qid: string; text: string; status: string }[] }[]
  register: { eid: string; title: string; status: string; note: string; freshness: string; confidence: string; limits: string[] }[]
  stats: { flags: number; unsourced: number; pending: number; missing_at_stop: number }
}
const SEV = { error: { Icon: ErrorCircle20Regular, label: 'Fix' }, warn: { Icon: Warning20Regular, label: 'Review' }, info: { Icon: Info20Regular, label: 'Note' } }

export default function EvidenceGaps() {
  const q = useScoped<Data>('/api/actions/evidence-gaps')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const areas = [...new Set(d.flags.map((f) => f.area))]
  const { search } = useLocation()
  return (
    <>
      <Link className="btn btn--subtle back-link" to={{ pathname: '/overview/account-assessment', search }}>
        <ArrowLeft16Regular aria-hidden="true" /> Back to account assessment
      </Link>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <div className="statline">
        <div><span className="big-num">{d.stats.flags}</span><span>validation flags</span></div>
        <div><span className="big-num">{d.stats.missing_at_stop}</span><span>records missing where a dimension stopped</span></div>
        <div><span className="big-num">{d.stats.pending}</span><span>checks still pending</span></div>
        <div><span className="big-num">{d.stats.unsourced}</span><span>answers without a source ID</span></div>
      </div>

      <Panel className="aa-row" title="Missing evidence where each dimension stopped"
        sub="Not disclosed or Check pending records at the next level. When a cell's weighted evidence reaches the 35% threshold, it can raise the score.">
        <div className="queue">
          {d.queue.map((c) => (
            <div key={c.cell} className="queue__cell" style={{ ['--dc' as string]: DIM_COLOR[c.dimension] }}>
              <div className="queue__head">
                <code className="queue__id">{c.cell}</code>
                <b>{c.name}</b>
                <span className="muted">score now {c.score}</span>
              </div>
              {c.testable ? (
                <>
                  <div className="queue__meter"><Bar value={c.pct ?? 0} marker={c.threshold} color={DIM_COLOR[c.dimension]} /><span>{c.pct != null ? `${Math.round(c.pct)}%` : '—'} of {c.threshold}%</span></div>
                  <p className="queue__req">{c.requirement}</p>
                  {c.missing.length ? (
                    <ul className="queue__list">
                      {c.missing.map((m) => <li key={m.qid}><span className="qid-inline">{m.qid}</span><span><Filled text={m.text} /></span><StatusChip status={m.status} size="sm" /></li>)}
                    </ul>
                  ) : <p className="muted">No missing records at this level: the answered evidence is below the threshold.</p>}
                </>
              ) : (
                <p className="queue__ceiling">Not testable. No maturity question in this set tests {c.cell}, so a reviewer answer cannot raise this score. Add a public-source question at this level, or accept the current level as the ceiling.</p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="aa-row" title="Validation flags" sub="Raised against the inputs. Nothing has been changed in the source data.">
        {areas.map((a) => (
          <div key={a} className="flaggrp">
            <h3 className="flaggrp__h">{a}</h3>
            <ul className="rows">
              {d.flags.filter((f) => f.area === a).map((f, i) => {
                const { Icon, label } = SEV[f.severity]
                return (
                  <li key={i} className={`flag flag--${f.severity}`}>
                    <Icon className="flag__icon" />
                    <div>
                      <p><b>{f.kind}</b> <span className="flag__sev">{label}</span></p>
                      <p className="flag__text">{f.text}</p>
                      {f.questions.length > 0 && (
                        <div className="flag__qs">{f.questions.map((q) => <span key={q.qid} className="qid-chip" title={q.text}>{q.qid}</span>)}</div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Panel>

      {d.register.length > 0 && (
        <Panel pad={false} className="aa-row" title="Evidence records needing attention" sub="From Evidence register v2: anything not yet accepted outright.">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Record</th><th>Claim</th><th>Register status</th><th>Freshness</th><th>Confidence</th></tr></thead>
              <tbody>
                {d.register.map((r) => (
                  <tr key={r.eid}>
                    <td className="qid">{r.eid}</td>
                    <td className="q">{r.title}<small className="cell-note">{r.note}</small></td>
                    <td><span className="pill pill--amber">{r.status}</span></td>
                    <td className="wrap-sm">{r.freshness}</td>
                    <td>{r.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}
