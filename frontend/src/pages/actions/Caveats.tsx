import { Query } from '../../components/Query'
import { DemoNotice, PageHeader, Panel } from '../../components/ui'
import { useScoped, type Info } from '../../lib/api'

interface Data { info: Info; items: { topic: string; text: string }[]; notes: string[] }

export default function Caveats() {
  const q = useScoped<Data>('/api/actions/caveats')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const topics = [...new Set(d.items.map((i) => i.topic))]
  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />
      <Panel>
        <div className="caveats">
          {topics.map((t) => (
            <section key={t} className="caveats__grp">
              <h2 className="caveats__topic">{t}</h2>
              <ul>{d.items.filter((i) => i.topic === t).map((i) => <li key={i.text}>{i.text}</li>)}</ul>
            </section>
          ))}
        </div>
      </Panel>
      {d.notes.length > 0 && (
        <Panel title="Run notes" className="aa-row">
          <ul className="notes">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </Panel>
      )}
    </>
  )
}
