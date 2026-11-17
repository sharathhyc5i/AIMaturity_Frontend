import { Open16Regular, Search20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'
import { Query } from '../../components/Query'
import { DemoNotice, Drawer, Empty, PageHeader, Panel } from '../../components/ui'
import { useScoped, type Info } from '../../lib/api'
import { DIM_COLOR } from '../../lib/constants'

export interface Source {
  id: number; retailer: string; market: string; code: string; title: string; publisher: string; date: string
  source_type: string; group: string; url: string; dimensions: string[]; used_for: string; citing_rows: number; cited_by: string[]
}
interface Data {
  info: Info; sources: Source[]
  summary: { total: number; by_group: Record<string, number>; dimensions: string[]; cited_this_month: number }
}

/** Colour of the source-type pill by its group (Primary, Secondary, Vendor case study, Direct observation). */
export const GROUP_PILL: Record<string, string> = {
  Primary: 'pill--green', Secondary: 'pill--blue', 'Vendor case study': 'pill--amber', 'Direct observation': 'pill--violet',
}

export default function SourceRegister() {
  const q = useScoped<Data>('/api/source-register')
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function DimList({ dims }: { dims: string[] }) {
  return (
    <span className="src-dims">
      {dims.map((x) => <b key={x} style={{ color: DIM_COLOR[x] ?? 'var(--muted)' }}>{x}</b>)}
    </span>
  )
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function View({ d }: { d: Data }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [dim, setDim] = useState('')
  const [open, setOpen] = useState<Source | null>(null)
  const groups = Object.keys(d.summary.by_group).sort()

  const rows = useMemo(() => d.sources.filter((s) =>
    (!group || s.group === group) &&
    (!dim || s.dimensions.includes(dim)) &&
    (!q || `${s.code} ${s.title} ${s.publisher} ${s.used_for} ${s.url}`.toLowerCase().includes(q.toLowerCase()))), [d, q, group, dim])

  return (
    <>
      <PageHeader info={d.info} lede={`Every link consulted for the ${d.info.retailer.name} · ${d.info.market.name} run, and what it was used for. Question results cite these IDs.`} />
      <DemoNotice info={d.info} />

      <div className="statline">
        <div><span className="big-num">{d.summary.total}</span><span>sources logged</span></div>
        <div><span className="big-num">{d.summary.by_group['Primary'] ?? 0}</span><span>primary</span></div>
        <div><span className="big-num">{(d.summary.by_group['Secondary'] ?? 0) + (d.summary.by_group['Vendor case study'] ?? 0)}</span><span>secondary or vendor</span></div>
        <div><span className="big-num">{d.summary.cited_this_month}</span><span>cited by this month’s results</span></div>
      </div>

      <Panel className="aa-row" title="Source log">
        {d.sources.length === 0 ? (
          <Empty title="No sources logged for this account yet.">Admins add sources in Admin › Settings › Sources.</Empty>
        ) : (
          <>
            <div className="toolbar">
              <label className="search"><Search20Regular /><input type="search" placeholder="Search sources" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sources" /></label>
              <select className="select" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Source type">
                <option value="">All source types</option>
                {groups.map((g) => <option key={g}>{g}</option>)}
              </select>
              <select className="select" value={dim} onChange={(e) => setDim(e.target.value)} aria-label="Dimension">
                <option value="">All dimensions</option>
                {d.summary.dimensions.map((x) => <option key={x}>{x}</option>)}
              </select>
              <span className="toolbar__count">{rows.length} of {d.sources.length}</span>
            </div>

            <div className="table-wrap qt-wide">
              <table className="table">
                <thead><tr><th>ID</th><th>Source</th><th>Date</th><th>Source type</th><th>Dimensions</th><th>What we used it for</th><th className="num">Rows citing</th></tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="is-click" tabIndex={0} onClick={() => setOpen(s)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(s) }}>
                      <td className="qid">{s.code}</td>
                      <td className="q">
                        {s.title}
                        <small className="cell-note">
                          {s.publisher}
                          {s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{host(s.url)} <Open16Regular className="src-ext" /></a></>}
                        </small>
                      </td>
                      <td className="nowrap">{s.date}</td>
                      <td><span className={`pill ${GROUP_PILL[s.group] ?? ''}`} title={s.source_type}>{s.source_type}</span></td>
                      <td className="nowrap"><DimList dims={s.dimensions} /></td>
                      <td className="wrap-md">{s.used_for}</td>
                      <td className="num">{s.citing_rows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="rows qt-narrow">
              {rows.map((s) => (
                <li key={s.id}>
                  <button type="button" className="qt-card" onClick={() => setOpen(s)}>
                    <span className="qt-card__top"><span className="qid-inline">{s.code}</span><DimList dims={s.dimensions} /><span className={`pill ${GROUP_PILL[s.group] ?? ''}`}>{s.group}</span></span>
                    <span className="qt-card__q">{s.title}</span>
                    <span className="qt-card__f">{s.publisher} · {s.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open && <><span className="qid-inline">{open.code}</span><h2 className="drawer__h">{open.title}</h2></>}>
        {open && (
          <div className="qd">
            <div className="qd__chips">
              <span className={`pill ${GROUP_PILL[open.group] ?? ''}`}>{open.source_type}</span>
              <DimList dims={open.dimensions} />
            </div>
            <dl className="dl">
              <dt>Link</dt><dd>{open.url ? <a href={open.url} target="_blank" rel="noreferrer" className="src-link">{open.url}</a> : '—'}</dd>
              <dt>Publisher</dt><dd>{open.publisher || '—'}</dd>
              <dt>Date</dt><dd>{open.date || '—'}</dd>
              <dt>What we used it for</dt><dd>{open.used_for || '—'}</dd>
              <dt>Question rows citing</dt><dd>{open.citing_rows} in the source log</dd>
              <dt>Cited this month</dt>
              <dd>
                {open.cited_by.length
                  ? <div className="flag__qs">{open.cited_by.map((x) => <span key={x} className="qid-chip">{x}</span>)}</div>
                  : <span className="muted">No question result for {d.info.period} cites {open.code}.</span>}
              </dd>
            </dl>
          </div>
        )}
      </Drawer>
    </>
  )
}
