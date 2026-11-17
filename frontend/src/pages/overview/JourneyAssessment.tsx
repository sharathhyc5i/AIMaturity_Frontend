import { Cart20Regular, DataBarVertical20Regular, PersonSupport20Regular, Search20Regular, Sparkle20Regular } from '@fluentui/react-icons'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Query } from '../../components/Query'
import { DemoNotice, PageHeader, Panel, Segmented } from '../../components/ui'
import { useScoped, type DimCode, type Info } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'

interface Stage {
  position: number; stage: string; question: string; connection: string; dims: DimCode[]; distributor_stage: string
  readiness: number; scores: { dimension: DimCode; label: string; value: number }[]
  evidence: { eid: string; title: string; stage: string; cell: string; confidence: string }[]
}
interface Data {
  info: Info; route: { id: number; name: string; scope: string; emphasis: string }
  routes: { id: number; name: string; scope: string; emphasis: string }[]
  distributor: boolean; stages: Stage[]; note: string; distributor_note: string
}
const ICONS = [Search20Regular, DataBarVertical20Regular, Cart20Regular, Sparkle20Regular, PersonSupport20Regular]

export default function JourneyAssessment() {
  const q = useScoped<Data>('/api/journey')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const [variant, setVariant] = useState<'consumer' | 'distributor'>(d.distributor ? 'distributor' : 'consumer')
  const [active, setActive] = useState(0)
  const s = d.stages[active]
  const name = (st: Stage) => (variant === 'distributor' ? st.distributor_stage : st.stage)

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <div className="routes">
        {d.routes.map((r) => (
          <div key={r.id} className={`route ${r.id === d.route.id ? 'is-on' : ''}`} aria-current={r.id === d.route.id}>
            <span className="route__n">Route {r.id}</span>
            <b>{r.name}</b>
            <span className="muted">{r.scope}</span>
            {r.id === d.route.id && <span className="pill pill--blue route__tag">{d.info.retailer.name} follows this route</span>}
          </div>
        ))}
      </div>

      <Panel className="aa-row" title="Journey stages"
        sub={variant === 'distributor' ? d.distributor_note : 'Each observation informs the rubric anchors it connects to. It does not create another averaged score.'}
        actions={<Segmented label="Journey variant" value={variant} onChange={setVariant} options={[{ value: 'consumer', label: 'Customer journey' }, { value: 'distributor', label: 'Distributor journey' }]} />}>
        <ol className="journey" role="tablist" aria-label="Journey stages">
          {d.stages.map((st, i) => {
            const Icon = ICONS[i]
            return (
              <li key={st.position}>
                <button type="button" role="tab" aria-selected={i === active} className={`journey__step ${i === active ? 'is-on' : ''}`} onClick={() => setActive(i)}>
                  <span className="journey__icon"><Icon /></span>
                  <span className="journey__n">{st.position}</span>
                  <span className="journey__name">{name(st)}</span>
                  <span className="journey__dims">{st.dims.map((x) => <i key={x} style={{ background: DIM_COLOR[x] }} title={x} />)}</span>
                  <span className="journey__ready">L{st.readiness.toFixed(2)}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <motion.div key={`${active}-${variant}`} className="journey__detail" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
          <div>
            <p className="kicker">Stage {s.position} · {name(s)}</p>
            <h3 className="journey__q">{s.question}</h3>
            <p className="muted">Rubric connection: {s.connection}</p>
          </div>
          <div className="journey__scores">
            {s.scores.map((x) => (
              <div key={x.dimension} className="jscore" style={{ ['--dc' as string]: DIM_COLOR[x.dimension] }}>
                <span className="jscore__d">{x.dimension}</span>
                <span className="jscore__v">{x.label}</span>
                <span className="bench__track"><span style={{ width: `${Math.min(100, (x.value / 5) * 100)}%`, background: DIM_COLOR[x.dimension] }} /></span>
              </div>
            ))}
            <p className="muted jscore__note">Stage readiness is the lower of its connected dimensions: L{s.readiness.toFixed(2)}.</p>
          </div>
          {s.evidence.length > 0 && (
            <div className="journey__ev">
              <p className="kicker">Evidence on file for these dimensions</p>
              <ul className="rows">
                {s.evidence.map((e) => (
                  <li key={e.eid} className="ev-line">
                    <code>{e.eid}</code><span>{e.title}</span><span className="pill">{e.stage}</span><span className="pill">{e.cell}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </Panel>

      <Panel className="aa-row" title={`What route ${d.route.id} emphasises`}>
        <p>{d.route.emphasis}</p>
        <p className="muted" style={{ marginTop: 8 }}>{d.note}</p>
      </Panel>
    </>
  )
}
