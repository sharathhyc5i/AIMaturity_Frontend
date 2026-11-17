import { Query } from '../../components/Query'
import { Filled, LensPill } from '../../components/QuestionTable'
import { DemoNotice, DimTag, Empty, PageHeader, Panel } from '../../components/ui'
import { useMeta, useScoped, type DimCode, type Info, type QRow } from '../../lib/api'

interface Data { info: Info; total: number; maturity: number; groups: { dimension: DimCode; items: QRow[] }[] }

export default function NotPublished() {
  const q = useScoped<Data>('/api/actions/unpublished')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta()
  const name = (c: string) => meta?.dimensions.find((x) => x.code === c)?.short ?? c
  const r = d.info.retailer.name
  return (
    <>
      <PageHeader title={`What ${r} didn’t publish`} lede={`Questions where ${r} publishes nothing either way. This is a statement about the public record, not about ${r}'s capability, and it is reported as a limit.`} info={d.info} />
      <DemoNotice info={d.info} />
      <div className="statline statline--2">
        <div><span className="big-num">{d.total}</span><span>questions marked Not disclosed</span></div>
        <div><span className="big-num">{d.maturity}</span><span>of them maturity questions, weighted 0 in the score</span></div>
      </div>
      {d.total === 0 ? <Empty title="Nothing is marked Not disclosed for this view." /> : (
        <div className="stack-y aa-row">
          {d.groups.filter((g) => g.items.length).map((g) => (
            <Panel key={g.dimension} title={<><DimTag code={g.dimension} /> <span style={{ marginLeft: 6 }}>{name(g.dimension)}</span></>} sub={`${g.items.length} not disclosed`}>
              <ul className="rows np">
                {g.items.map((q) => (
                  <li key={q.qid}>
                    <div className="np__top"><span className="qid-inline">{q.qid}</span><LensPill lens={q.lens} />{q.level && <span className="pill">Level {q.level}</span>}<span className="muted np__theme">{q.sub_theme}</span></div>
                    <p className="np__q"><Filled text={q.text} /></p>
                    <p className="np__f">{q.finding}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
