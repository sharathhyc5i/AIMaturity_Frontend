import { Query } from '../../components/Query'
import { PageHeader, Panel } from '../../components/ui'
import { useGuide } from '../../lib/api'

interface Data { policy: { evidence: string; window: string; action: string }[]; confidence: { level: string; meaning: string }[] }

/** A policy window for the table: H shows as its badge, a blank window as "Not applicable". */
function windowOf(w: string) {
  if (w.trim() === 'H') return <span className="fresh__tw">Older than 12 months <span className="h-flag">H</span></span>
  if (!w.trim() || w.trim() === '—' || w.trim() === '-') return <span className="muted">Not applicable</span>
  return <b>{w}</b>
}

export default function Freshness() {
  const q = useGuide<Data>('freshness')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const [dyn, ops, old, rep] = d.policy
  return (
    <>
      <PageHeader lede="How old evidence can be before it must be refreshed or marked H. These windows are operating defaults for approval, not externally established standards." />
      <Panel title="Evidence age, from capture to history">
        <div className="fresh">
          <div className="fresh__track" aria-hidden="true">
            <span className="fresh__seg fresh__seg--a" />
            <span className="fresh__seg fresh__seg--b" />
            <span className="fresh__seg fresh__seg--c" />
          </div>
          <div className="fresh__cols">
            <div><span className="fresh__w">{dyn.window}</span><b>{dyn.evidence}</b><p>{dyn.action}</p></div>
            <div><span className="fresh__w">{ops.window}</span><b>{ops.evidence}</b><p>{ops.action}</p></div>
            <div><span className="fresh__w">Older than 12 months <span className="h-flag">H</span></span><b>{old.evidence}</b><p>{old.action}</p></div>
          </div>
        </div>
      </Panel>
      <div className="grid-2 aa-row">
        <Panel title={rep.evidence}>
          <p>{rep.action}</p>
          <p className="muted" style={{ marginTop: 8 }}>Example: partner posts repeating Best Buy’s agentic-checkout announcement do not reset its date (EV-007).</p>
        </Panel>
        <Panel title="How freshness shows up in the app">
          <ul className="notes">
            <li>Scores carry <span className="h-flag" style={{ marginLeft: 0 }}>H</span> when the key evidence for the level reached is older than 12 months.</li>
            <li>Dynamic price and availability evidence is flagged for refresh in Evidence gaps.</li>
            <li>Records past their window appear in Next actions with an owner and due date.</li>
          </ul>
        </Panel>
      </div>
      <Panel pad={false} className="aa-row" title="Policy table">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Evidence</th><th>Window</th><th>Action</th></tr></thead>
            <tbody>
              {d.policy.map((p) => (
                <tr key={p.evidence}>
                  <td className="wrap-sm">{p.evidence}</td>
                  <td className="nowrap">{windowOf(p.window)}</td>
                  <td className="wrap-sm">{p.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
