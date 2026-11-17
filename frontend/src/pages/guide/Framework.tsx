import { useMemo } from 'react'
import { bandOf } from '../../components/DimensionOverview'
import { Query } from '../../components/Query'
import { LevelDots, Loading, PageHeader, Panel } from '../../components/ui'
import { useGuide, useMeta, useScoped, type DimCode, type QRow, type Score } from '../../lib/api'
import { DIM_COLOR, RATING, fmtPeriod } from '../../lib/constants'
import { dryRunQuestions, hasDryRun } from '../../lib/dryRun'
import { useFilters } from '../../lib/filters'

interface Data {
  scoring: { weights: Record<string, number>; threshold: number; infer: boolean; rule: string }
  cells: { dimension: string; level: number; name: string; stage: string; test: string; threshold: string; questions: number }[]
}

export default function Framework() {
  const q = useGuide<Data>('framework')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta()
  return (
    <>
      <PageHeader />
      <Scoring />
      <div className="stack-y aa-row">
        {(meta?.dimensions.map((x) => x.code) ?? []).map((dc) => (
          <Panel key={dc} pad={false} title={<><span className="dimcode" style={{ color: DIM_COLOR[dc] }}>{dc}</span> {meta?.dimensions.find((x) => x.code === dc)?.name}</>}>
            <div className="table-wrap">
              <table className="table fw">
                <thead><tr><th>Cell</th><th>Stage</th><th>Level test</th><th>Threshold in AI input spec</th></tr></thead>
                <tbody>
                  {d.cells.filter((c) => c.dimension === dc).map((c) => (
                    <tr key={c.level} className={c.questions ? '' : 'is-untested'}>
                      <td className="qid">{c.dimension}-L{c.level}<small className="cell-note">{c.name}</small></td>
                      <td>{c.stage}</td>
                      <td className="wrap-sm">{c.test}</td>
                      <td className="wrap-sm">{c.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>
    </>
  )
}

/** What each answer scores. N/A is left out of every average. */
const POINTS = [
  { rating: RATING.good, answer: 'Yes', points: '1' },
  { rating: RATING.okay, answer: 'Partial', points: '0.5' },
  { rating: RATING.needs, answer: 'No', points: '0' },
] as const

const stageFor = (lv: number) => (lv >= 4 ? 'Run' : lv === 3 ? 'Walk' : 'Crawl')

const average = (qs: QRow[]) => {
  const s = qs.map((q) => q.score).filter((x): x is number => x != null)
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null
}

interface DimResult extends Score {
  /** Average question score (0–1) */
  average: number | null
  /** Each level's average (0–1), for levels with questions */
  levelAverages: { level: number; average: number | null }[]
}

/** One dimension's score: the average of all its questions' scores (every lens, N/A left out) × 5. */
function scoreDimension(dim: DimCode, qs: QRow[], maxLevel: number): DimResult {
  const inDim = qs.filter((q) => q.dimension === dim)
  const a = average(inDim)
  const v = Math.round((a ?? 0) * 5 * 100) / 100
  const lv = Math.floor(v)
  return {
    dimension: dim, level: lv, fraction: v - lv, value: v, number: v.toFixed(2), h: false,
    label: v.toFixed(2), key: `L${lv}`, stage: stageFor(lv), ceiling: maxLevel, cells: [],
    average: a,
    levelAverages: Array.from({ length: maxLevel }, (_, i) => i + 1)
      .filter((L) => inDim.some((q) => q.level === L))
      .map((L) => ({ level: L, average: average(inDim.filter((q) => q.level === L)) })),
  }
}

/** How the dimension scores are worked out, and the results for this account. Read-only. */
function Scoring() {
  const { retailer, market, period, meta } = useFilters()
  const q = useScoped<{ questions: QRow[] }>('/api/outcomes')
  const rname = meta?.retailers.find((r) => r.slug === retailer)?.name
  const dims = (meta?.dimensions ?? []).map((x) => x.code as DimCode)
  const maxLevel = meta?.levels.length ?? 5
  const scores = useMemo(() => {
    if (!q.data) return []
    // Best Buy and Amazon use the dry-run scores; others rate each stored score
    const qs = hasDryRun(retailer)
      ? dryRunQuestions(retailer, q.data.questions)
      : q.data.questions.map((x) => (x.score == null ? x : { ...x, status: bandOf(x.score) as QRow['status'] }))
    return dims.map((dc) => scoreDimension(dc, qs, maxLevel))
  }, [q.data, retailer, dims.join(), maxLevel]) // eslint-disable-line react-hooks/exhaustive-deps
  const overall = scores.length ? scores.reduce((a, s) => a + s.value, 0) / scores.length : 0
  const overallStage = stageFor(Math.floor(overall))

  return (
    <Panel title="Scoring"
      sub={`How ${rname ?? 'the account'} · ${market} · ${period ? fmtPeriod(period) : ''} is scored. The rule is fixed.`}>
      <div className="sim">
        <div className="sim__controls">
          <p className="sim__h">Score per answer</p>
          <dl className="sim__fixed">
            {POINTS.map((p) => (
              <div key={p.answer} className="sim__row">
                <dt className="slider__name">
                  <i style={{ background: p.rating.color }} aria-hidden="true" />
                  <span>{p.rating.label}<small>Answer {p.answer}</small></span>
                </dt>
                <dd>{p.points}</dd>
              </div>
            ))}
          </dl>
          <p className="sim__note">N/A answers are left out of every average.</p>
          <p className="sim__h sim__h--gap">Rule</p>
          <dl className="sim__fixed">
            <div className="sim__row">
              <dt className="slider__name"><span>Level<small>Average of its questions</small></span></dt>
              <dd>0–100%</dd>
            </div>
            <div className="sim__row">
              <dt className="slider__name"><span>Dimension<small>Average of all its questions × 5</small></span></dt>
              <dd>0–5</dd>
            </div>
            <div className="sim__row">
              <dt className="slider__name"><span>Overall<small>Average of D1–D4</small></span></dt>
              <dd>0–5</dd>
            </div>
          </dl>
          <p className="sim__note">Every question counts: maturity, OEM and retailer axis.</p>
        </div>
        <div className="sim__res" aria-live="polite">
          {!q.data ? (
            <Loading rows={2} />
          ) : (
            <>
              <div className={`sim__overall overall--${overallStage.toLowerCase()}`}>
                <span className="sim__overall-k">Overall</span>
                <span className="sim__overall-v">{overall.toFixed(2)}</span>
                <span className="sim__overall-s">{overallStage}</span>
                <span className="muted sim__overall-n">Average of the {scores.length} dimension scores</span>
              </div>
              <div className="sim__out">
                {scores.map((s) => (
                  <div key={s.dimension} className="sim__dim" style={{ ['--dc' as string]: DIM_COLOR[s.dimension] }}>
                    <div className="sim__top">
                      <span className="sim__code">{s.dimension}</span>
                      <span className="sim__name">{meta?.dimensions.find((x) => x.code === s.dimension)?.short}</span>
                    </div>
                    <span className="sim__val">{s.label}</span>
                    <span className="sim__stage">
                      {s.stage}
                      {s.average != null && ` · ${Math.round(s.average * 100)}% average × 5`}
                    </span>
                    <LevelDots score={s} />
                    <ul className="sim__levels">
                      {s.levelAverages.map((l) => (
                        <li key={l.level}>
                          <b>L{l.level}</b> {l.average == null ? 'N/A' : `${Math.round(l.average * 100)}%`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
          {q.isError && <p className="muted">The scores could not be loaded.</p>}
        </div>
      </div>
    </Panel>
  )
}
