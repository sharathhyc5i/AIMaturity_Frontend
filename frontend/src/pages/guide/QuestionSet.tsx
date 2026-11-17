import { useMemo } from 'react'
import { Query } from '../../components/Query'
import { QuestionTable } from '../../components/QuestionTable'
import { PageHeader, Panel } from '../../components/ui'
import { useGuide, useMeta, type QRow } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'
import { dryRunQuestions, hasDryRun } from '../../lib/dryRun'
import { useFilters } from '../../lib/filters'

interface Data {
  questions: Omit<QRow, 'status' | 'finding' | 'sources' | 'flags' | 'origin'>[]
  summary: { dimension: string; total: number; new: number; modified: number; unchanged: number; maturity: number; vendor: number; retailer: number }[]
  readme: { k: string; v: string }[]
}

export default function QuestionSet() {
  const q = useGuide<Data>('question-set')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta()
  const { retailer } = useFilters()
  // The dry-run question set (191 questions); scores are the header retailer's, or Best Buy's
  const rows: QRow[] = useMemo(() => {
    const base = d.questions.map((q) => ({ ...q, status: 'N/A', finding: '', sources: [], flags: [], origin: null }) as QRow)
    return dryRunQuestions(hasDryRun(retailer) ? retailer : 'best-buy', base)
  }, [d, retailer])
  const summary = useMemo(() => {
    const by: Record<string, number> = {}
    for (const r of rows) by[r.dimension] = (by[r.dimension] ?? 0) + 1
    return Object.entries(by).map(([dimension, total]) => ({ dimension, total }))
  }, [rows])
  const total = rows.length

  return (
    <>
      <PageHeader lede={`Question set: ${total} questions across four dimensions, every one answerable by an agent from public sources on a monthly cycle.`} />
      <Panel pad={false} title="What the set contains">
        <div className="table-wrap">
          <table className="table qs-summary">
            <thead><tr><th>Dimension</th><th className="num">Questions</th></tr></thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.dimension}>
                  <th scope="row"><span className="dimcode" style={{ color: DIM_COLOR[s.dimension] }}>{s.dimension}</span> {meta?.dimensions.find((x) => x.code === s.dimension)?.name}</th>
                  <td className="num"><b>{s.total}</b></td>
                </tr>
              ))}
              <tr className="total-row"><th scope="row">Total</th><td className="num"><b>{total}</b></td></tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="aa-row" title={`Question set · ${total}`} actions={null}>
        <QuestionTable rows={rows} showStatus={false} fill={false} hideLens />
      </Panel>
    </>
  )
}
