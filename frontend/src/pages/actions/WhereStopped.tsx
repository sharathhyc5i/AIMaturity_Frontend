import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft16Regular } from '@fluentui/react-icons'
import { Query } from '../../components/Query'
import { DemoNotice, LevelLadder, PageHeader } from '../../components/ui'
import { useMeta, useScoped, type Info, type Score } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'

interface Data {
  info: Info
  dimensions: { score: Score; reason: string; baseline?: string; next: { cell: string; name: string; stage: string; test: string; threshold: string; boundary: string } | null }[]
}

export default function WhereStopped() {
  const q = useScoped<Data>('/api/actions/stops')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta()
  const { search } = useLocation()
  const name = (c: string) => meta?.dimensions.find((x) => x.code === c)?.name ?? c
  return (
    <>
      <Link className="btn btn--subtle back-link" to={{ pathname: '/overview/account-assessment', search }}>
        <ArrowLeft16Regular aria-hidden="true" /> Back to account assessment
      </Link>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />
      <p className="rule-line">Work up from Level 1 and stop at the first level not met — that is the score. A strong signal higher up cannot make up for a missing level below it.</p>
      <div className="stops">
        {d.dimensions.map(({ score: s, reason, baseline, next }) => (
          <article key={s.dimension} className="stop" style={{ ['--dc' as string]: DIM_COLOR[s.dimension] }}>
            <div className="stop__score">
              <span className="stop__code">{s.dimension}</span>
              <span className="stop__name">{name(s.dimension)}</span>
              <span className="stop__val">{s.level ? s.number.replace(/^L(?=\d)/, '') : '—'}{s.h && <span className="h-flag">H</span>}</span>
              <span className="muted">{s.level ? `${s.stage} · levels ${Array.from({ length: s.level }, (_, i) => i + 1).join(', ')} met` : 'Not established'}</span>
              <LevelLadder score={s} />
              {baseline && <span className="stop__base">229-set baseline <b>{baseline}</b></span>}
            </div>
            <div className="stop__why">
              <p className="kicker">What stops it going higher</p>
              <p className="stop__reason">{reason}</p>
              {next && (
                <div className="stop__next">
                  <p className="kicker">Next level · {next.cell} {next.name} ({next.stage})</p>
                  <p><b>Test:</b> {next.test}</p>
                  <p><b>Threshold:</b> {next.threshold}</p>
                  <p className="muted"><b>Boundary:</b> {next.boundary}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
