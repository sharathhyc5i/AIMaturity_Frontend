import { Save20Regular } from '@fluentui/react-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/feedback'
import { LineChart } from '../../components/LineChart'
import { Query } from '../../components/Query'
import { DemoNotice, PageHeader, Panel, Tabs } from '../../components/ui'
import { send, useMeta, useScoped, type Info } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { DIM_COLOR, fmtPeriod } from '../../lib/constants'
import { useFilters } from '../../lib/filters'
import { Delta } from './CompetitorComparison'

interface SnapScore { dimension: string; label: string; value: number; level: number; cells: (number | null)[] }
interface Version { id: number; version: number; label: string; created_by: string; created_at: string; weights: Record<string, number>; threshold: number; scores: SnapScore[]; notes: string[] }
interface Data {
  info: Info
  current: { scores: SnapScore[]; weights: Record<string, number>; threshold: number }
  unsaved_changes: string[]
  versions: Version[]
  monthly: { period: string; data_source: string; scores: Record<string, { label: string; value: number }>; answered: number }[]
}

export default function ScoreRegister() {
  const q = useScoped<Data>('/api/score-register')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function when(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function View({ d }: { d: Data }) {
  const { isAdmin } = useAuth()
  const { retailer, market, period } = useFilters()
  const { data: meta } = useMeta()
  const qc = useQueryClient()
  const toast = useToast()
  const [ver, setVer] = useState(String(d.versions[d.versions.length - 1]?.version ?? 1))
  useEffect(() => setVer(String(d.versions[d.versions.length - 1]?.version ?? 1)), [d.versions])
  const [label, setLabel] = useState('')
  const save = useMutation({
    mutationFn: () => send<{ version: number }>('POST', '/api/admin/score-register/snapshot', { retailer, market, period, label }),
    onSuccess: (r) => { toast('ok', `Saved as version ${r.version}.`); setLabel(''); qc.invalidateQueries({ queryKey: ['/api/score-register'] }) },
    onError: (e) => toast('error', String((e as Error).message)),
  })
  const v = d.versions.find((x) => String(x.version) === ver)
  const prev = v ? d.versions.find((x) => x.version === v.version - 1) : undefined
  const dims = d.current.scores.map((s) => s.dimension)
  const name = (c: string) => meta?.dimensions.find((x) => x.code === c)?.short ?? c
  const months = d.monthly
  const [from, setFrom] = useState(months[0]?.period ?? '')
  const [to, setTo] = useState(months[months.length - 1]?.period ?? '')
  useEffect(() => { setFrom(months[0]?.period ?? ''); setTo(months[months.length - 1]?.period ?? '') }, [months])
  const fromRow = months.find((m) => m.period === from), toRow = months.find((m) => m.period === to)
  const top = meta?.levels.length ?? 5
  const series = useMemo(() => dims.map((x) => ({ name: x, color: DIM_COLOR[x], values: months.map((m) => m.scores[x]?.value ?? null) })), [dims, months])

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <Panel title="Saved versions" sub="Each version is a snapshot; earlier versions stay readable."
        actions={<Tabs value={ver} onChange={setVer} tabs={d.versions.map((x, i) => ({ value: String(x.version), label: `v${x.version}${i === d.versions.length - 1 ? ' · current' : ''}` }))} />}>
        {v && (
          <>
            <div className="ver">
              <div><b>v{v.version} · {v.label}</b><span className="muted">{when(v.created_at)} · by {v.created_by}</span></div>
              {v.weights && Object.keys(v.weights).length > 0 && <span className="pill">Threshold {v.threshold}% · Yes {v.weights.Yes} · Partial {v.weights.Partial} · Issue {v.weights.Issue}</span>}
            </div>
            <ul className="notes ver__notes">{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Dimension</th><th>Score</th>{prev && <th>v{prev.version}</th>}<th>Levels met</th>{Array.from({ length: top }, (_, i) => <th key={i} className="num">L{i + 1}</th>)}</tr></thead>
                <tbody>
                  {v.scores.map((s) => {
                    const p = prev?.scores.find((x) => x.dimension === s.dimension)
                    return (
                      <tr key={s.dimension}>
                        <th scope="row"><span className="dimcode" style={{ color: DIM_COLOR[s.dimension] }}>{s.dimension}</span>{name(s.dimension)}</th>
                        <td><b>{s.label.replace(/^L(?=\d)/, "")}</b>{p && (p.level !== s.level || p.label.includes('H') !== s.label.includes('H')) && <span className="pill pill--amber" style={{ marginLeft: 8 }}>changed</span>}</td>
                        {prev && <td className="muted">{p?.label ?? '—'}</td>}
                        <td><span className="pips">{Array.from({ length: top }, (_, i) => <i key={i} className={i < s.level ? 'on' : ''} style={i < s.level ? { background: DIM_COLOR[s.dimension] } : undefined} />)}</span></td>
                        {Array.from({ length: top }, (_, i) => {
                          const c = s.cells[i]
                          return <td key={i} className={`num ${i < s.level ? 'pc-met' : ''}`}>{c == null ? <span className="muted">—</span> : `${Math.round(c)}%`}</td>
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {d.unsaved_changes.length > 0 && (
          <p className="notice notice--info" style={{ marginTop: 14, marginBottom: 0 }}>
            Current scores differ from the latest version for {d.unsaved_changes.join(', ')} — for example after evidence was approved or a setting changed.
          </p>
        )}
        {isAdmin && (
          <form className="save-ver" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <label className="sr-label">
              <span>Save the current scores as a new version</span>
              <input className="input" placeholder="Label, e.g. After evidence review" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
            </label>
            <button type="submit" className="btn btn--primary" disabled={save.isPending}><Save20Regular />{save.isPending ? 'Saving…' : 'Save version'}</button>
          </form>
        )}
      </Panel>

      <Panel className="aa-row" title="Month-wise progress" sub={`Score by dimension for each month on file, using today's scoring settings.`}>
        <LineChart labels={months.map((m) => fmtPeriod(m.period).split(' ')[0])} series={series} yMin={0} yMax={top} format={(n) => n.toFixed(2)} />
      </Panel>

      <div className="grid-2 aa-row">
        <Panel title="Compare two months">
          <div className="mcompare__pick">
            <label>From <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>{months.map((m) => <option key={m.period} value={m.period}>{fmtPeriod(m.period)}</option>)}</select></label>
            <label>To <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>{months.map((m) => <option key={m.period} value={m.period}>{fmtPeriod(m.period)}</option>)}</select></label>
          </div>
          {fromRow && toRow && (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Dimension</th><th className="num">{fmtPeriod(from)}</th><th className="num">{fmtPeriod(to)}</th><th className="num">Change</th></tr></thead>
              <tbody>
                {dims.map((x) => (
                  <tr key={x}>
                    <th scope="row"><span className="dimcode" style={{ color: DIM_COLOR[x] }}>{x}</span>{name(x)}</th>
                    <td className="num">{fromRow.scores[x]?.label ?? '—'}</td>
                    <td className="num">{toRow.scores[x]?.label ?? '—'}</td>
                    <td className="num"><Delta v={(toRow.scores[x]?.value ?? 0) - (fromRow.scores[x]?.value ?? 0)} digits={2} /></td>
                  </tr>
                ))}
                <tr className="total-row"><th scope="row">Questions answered</th><td className="num">{fromRow.answered}</td><td className="num">{toRow.answered}</td><td className="num"><Delta v={toRow.answered - fromRow.answered} digits={0} /></td></tr>
              </tbody>
            </table></div>
          )}
        </Panel>
        <Panel pad={false} title="Every month">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Month</th>{dims.map((x) => <th key={x} className="num"><span style={{ color: DIM_COLOR[x] }}>{x}</span></th>)}<th className="num">Answered</th></tr></thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.period} className={m.period === period ? 'is-current-row' : ''}>
                    <th scope="row">{fmtPeriod(m.period)}<small className="cell-note">{m.data_source === 'workflow' ? 'Workflow run' : m.data_source === 'not_run' ? 'Not run' : 'Assessment'}</small></th>
                    {dims.map((x) => <td key={x} className="num">{m.scores[x]?.label ?? '—'}</td>)}
                    <td className="num">{m.answered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
