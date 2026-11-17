import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/BrandLogo'
import { Query } from '../../components/Query'
import { PageHeader, Panel } from '../../components/ui'
import { useGuide } from '../../lib/api'
import { DIM_COLOR, fmtPeriod } from '../../lib/constants'
import { RUN_PARAMETERS } from '../../lib/runParameters'
import { sampleLabel } from '../../lib/sample'

interface Data {
  accounts: { retailer: string; slug: string; segment: string; route: string; market: string; market_code: string; peers: string[]; periods: number; latest: string; data_source: string; scores: Record<string, string> }[]
  run_parameters: { key: string; value: string; notes: string }[]
}

export default function Accounts() {
  const q = useGuide<Data>('accounts')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

/** The accounts on this list: Best Buy and Amazon, both in the US (Americas). */
const SHOWN = [
  { slug: 'best-buy', market: 'US' },
  { slug: 'amazon', market: 'US' },
]

function View({ d }: { d: Data }) {
  const nav = useNavigate()
  const accounts = d.accounts.filter((a) => SHOWN.some((s) => s.slug === a.slug && s.market === a.market_code))
  const open = (slug: string, market: string, period: string) =>
    nav({ pathname: '/overview/account-assessment', search: `?retailer=${slug}&market=${market}&period=${period}` })
  return (
    <>
      <PageHeader />
      <div className="accounts">
        {accounts.map((a) => (
          <article key={`${a.slug}-${a.market_code}`} className="account">
            <div className="account__head">
              <BrandLogo id={a.slug} name={a.retailer} height={22} />
            </div>
            <p className="account__market">{a.market}</p>
            <p className="muted account__route">{a.route} · {a.segment}</p>
            <div className="account__scores">
              {Object.entries(a.scores).map(([k, v]) => (
                <span key={k}><b style={{ color: DIM_COLOR[k] }}>{k}</b>{sampleLabel(a.slug, k, v)}</span>
              ))}
            </div>
            <div className="account__foot">
              <span className="muted">Latest {fmtPeriod(a.latest)}</span>
              <button type="button" className="btn btn--subtle" onClick={() => open(a.slug, a.market_code, a.latest)}>Open assessment</button>
            </div>
          </article>
        ))}
      </div>
      <Panel pad={false} className="aa-row" title="Run parameters" sub="Set once per run. Every question with a placeholder takes its value from here.">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Placeholder / setting</th><th>Value for this run</th><th>Notes</th></tr></thead>
            <tbody>{RUN_PARAMETERS.map((p) => <tr key={p.key}><td className="qid">{p.key}</td><td><b>{p.value}</b></td><td className="wrap-sm">{p.notes}</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
