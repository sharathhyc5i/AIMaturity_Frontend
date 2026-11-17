import { Filled } from '../../components/QuestionTable'
import { Query } from '../../components/Query'
import { DemoNotice, DimTag, Empty, PageHeader, Panel, Sources } from '../../components/ui'
import { useMeta, useScoped, type DimCode, type Info, type Score } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'

interface Live { eid: string; title: string; claim: string; stage: string; cell: string; channel: string; use_case: string; confidence: string; h_flag: boolean; sources: string[]; limits: string[] }
interface ByDim {
  dimension: DimCode; yes: number; partial: number
  themes: { name: string; yes: number; partial: number; qids: string[] }[]
  highlights: { qid: string; text: string; finding: string; level: number | null; lens: string; sources: string[] }[]
}
interface Data { info: Info; live: Live[]; by_dimension: ByDim[]; scores: Score[] }

const CONF: Record<string, string> = { High: 'pill--green', Medium: 'pill--blue', Low: 'pill--amber', U: '' }

export default function Capabilities() {
  const q = useScoped<Data>('/api/actions/capabilities')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta()
  const name = (c: string) => meta?.dimensions.find((x) => x.code === c)?.short ?? c
  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <Panel title="Live today" sub="Capabilities with evidence of live, pilot or measured use, from the evidence register.">
        {d.live.length === 0 ? (
          <Empty title="No evidence records for this view.">Live capabilities come from the evidence register, which is filled when the agent runs. The question-level view below still shows what has been met.</Empty>
        ) : (
          <ul className="caps">
            {d.live.map((e) => (
              <li key={e.eid} className="cap" style={{ ['--dc' as string]: DIM_COLOR[e.cell.slice(0, 2) as DimCode] }}>
                <div className="cap__top">
                  <span className="pill">{e.stage}</span>
                  <span className={`pill ${CONF[e.confidence]}`}>{e.confidence} confidence</span>
                  {e.h_flag && <span className="h-flag" title="Older than 12 months">H</span>}
                  <code className="cap__cell">{e.cell}</code>
                </div>
                <h3 className="cap__title">{e.title}</h3>
                <p className="cap__claim">{e.claim}</p>
                <p className="cap__meta">{e.channel} · {e.use_case} · <Sources ids={e.sources} /></p>
                {e.limits.length > 0 && <p className="cap__limit">Limit: {e.limits[0]}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid-2 aa-row">
        {d.by_dimension.map((x) => {
          const sc = d.scores.find((s) => s.dimension === x.dimension)!
          return (
            <Panel key={x.dimension} title={<><DimTag code={x.dimension} /> <span style={{ marginLeft: 6 }}>{name(x.dimension)}</span></>}
              sub={`${x.yes} questions met · ${x.partial} partly met · score ${sc.label.replace(/^L(?=\d)/, "")}`}>
              <div className="theme-chips">
                {x.themes.slice(0, 8).map((t) => (
                  <span key={t.name} className="theme-chip" title={t.qids.join(', ')}>
                    {t.name}<b>{t.yes}</b>{t.partial > 0 && <small>+{t.partial}</small>}
                  </span>
                ))}
              </div>
              {x.highlights.length > 0 ? (
                <ul className="rows hl">
                  {x.highlights.map((h) => (
                    <li key={h.qid}>
                      <p className="hl__q"><span className="qid-inline">{h.qid}</span><Filled text={h.text} /></p>
                      <p className="hl__f">{h.finding}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">No question in this dimension is fully met yet.</p>}
            </Panel>
          )
        })}
      </div>
    </>
  )
}
