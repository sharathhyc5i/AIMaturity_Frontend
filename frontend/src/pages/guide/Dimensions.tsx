import { useState } from 'react'
import { Query } from '../../components/Query'
import { PageHeader, Tabs } from '../../components/ui'
import { useGuide, type DimCode } from '../../lib/api'
import { DIM_COLOR, DIM_TINT } from '../../lib/constants'

interface Data {
  dimensions: { code: DimCode; name: string; short: string; color: string; summary: string; levels: { level: number; name: string; stage: string; anchor: string; evidence: string; boundary: string }[] }[]
}

export default function Dimensions() {
  const q = useGuide<Data>('dimensions')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const [tab, setTab] = useState<DimCode>(d.dimensions[0]?.code ?? 'D1')
  const dim = d.dimensions.find((x) => x.code === tab) ?? d.dimensions[0]
  return (
    <>
      <PageHeader />
      <div className="dim-overview">
        {d.dimensions.map((x) => (
          <button key={x.code} type="button" className={`dim-ov ${tab === x.code ? 'is-on' : ''}`} onClick={() => setTab(x.code)} aria-pressed={tab === x.code}
            style={{ ['--dc' as string]: DIM_COLOR[x.code], ['--dt' as string]: DIM_TINT[x.code] }}>
            <b>{x.code}</b>
            <span className="dim-ov__name">{x.name}</span>
            <span className="dim-ov__sum">{x.summary}</span>
          </button>
        ))}
      </div>
      <section className="panel aa-row">
        <Tabs value={tab} onChange={setTab} tabs={d.dimensions.map((x) => ({ value: x.code, label: `${x.code} · ${x.short}` }))} />
        <ol className="deflist" style={{ ['--dc' as string]: DIM_COLOR[dim.code] }}>
          {dim.levels.map((l) => (
            <li key={l.level} className="deflist__row">
              <div className="deflist__lv">
                <span className="deflist__n">{l.level}</span>
                <span><b>{l.name}</b><small>{l.stage}</small></span>
              </div>
              <div className="deflist__cols">
                <div><p className="kicker">Required anchor</p><p>{l.anchor}</p></div>
                <div><p className="kicker">Evidence needed</p><p>{l.evidence}</p></div>
                <div className="deflist__boundary"><p className="kicker">Boundary</p><p>{l.boundary}</p></div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
