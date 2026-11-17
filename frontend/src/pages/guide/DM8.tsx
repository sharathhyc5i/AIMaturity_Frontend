import { useState } from 'react'
import { Query } from '../../components/Query'
import { PageHeader, Panel } from '../../components/ui'
import { useGuide } from '../../lib/api'

interface Data {
  markets: { code: string; name: string; currency: string; market_maker: number; strategic: number; total: number; assessed: string[] }[]
  totals: { market_maker: number; strategic: number; total: number; markets: number }
}
const MM = '#0F6CBD', ST = '#8764B8'

export default function DM8() {
  const q = useGuide<Data>('dm8')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(...d.markets.map((m) => m.total))
  const sorted = [...d.markets].sort((a, b) => b.total - a.total)
  return (
    <>
      <PageHeader lede={`The ${d.totals.markets} target markets for the assessment and how many account entries each holds, split between Market Maker and Strategic accounts. A run covers one market; no rating transfers across markets.`} />
      <div className="statline">
        <div><span className="big-num">{d.totals.markets}</span><span>markets</span></div>
        <div><span className="big-num">{d.totals.total}</span><span>account entries</span></div>
        <div><span className="big-num" style={{ color: MM }}>{d.totals.market_maker}</span><span>Market Maker</span></div>
        <div><span className="big-num" style={{ color: ST }}>{d.totals.strategic}</span><span>Strategic</span></div>
      </div>
      <div className="grid-2 aa-row dm8">
        <Panel title="Entries per market" sub="Sorted by total entries. Hover a bar for its split.">
          <ul className="legend" style={{ marginBottom: 14 }}>
            <li><i style={{ background: MM }} />Market Maker</li>
            <li><i style={{ background: ST }} />Strategic</li>
          </ul>
          <ul className="hbars">
            {sorted.map((m) => (
              <li key={m.code} onMouseEnter={() => setHover(m.code)} onMouseLeave={() => setHover(null)} className={hover && hover !== m.code ? 'is-dim' : ''}>
                <span className="hbars__label">{m.name}</span>
                <span className="hbars__bar" style={{ width: `${(m.total / max) * 100}%` }}>
                  <span style={{ flexGrow: m.market_maker, background: MM }} />
                  <span style={{ flexGrow: m.strategic, background: ST }} />
                  {hover === m.code && <span className="stack__tip" style={{ opacity: 1 }}>{m.market_maker} Market Maker · {m.strategic} Strategic</span>}
                </span>
                <span className="hbars__val">{m.total}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel pad={false} title="Market table">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Market</th><th className="num">Market Maker</th><th className="num">Strategic</th><th className="num">Total</th><th>Assessed here</th></tr></thead>
              <tbody>
                {d.markets.map((m) => (
                  <tr key={m.code}>
                    <th scope="row">{m.name} <span className="muted mono">{m.currency}</span></th>
                    <td className="num">{m.market_maker}</td><td className="num">{m.strategic}</td><td className="num"><b>{m.total}</b></td>
                    <td className="wrap-sm">{m.assessed.length ? m.assessed.join(', ') : <span className="muted">Not yet</span>}</td>
                  </tr>
                ))}
                <tr className="total-row"><th scope="row">Total</th><td className="num">{d.totals.market_maker}</td><td className="num">{d.totals.strategic}</td><td className="num"><b>{d.totals.total}</b></td><td /></tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
