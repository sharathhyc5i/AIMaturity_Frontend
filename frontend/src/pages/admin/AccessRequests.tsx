import { Checkmark20Regular, Copy16Regular, Mail20Regular, Send20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '../../components/feedback'
import { Query } from '../../components/Query'
import { Empty, PageHeader, Panel, RatingChip, Segmented, Tabs } from '../../components/ui'
import { getJSON, send } from '../../lib/api'
import { fmtDate, fmtPeriod } from '../../lib/constants'
import { useFilters } from '../../lib/filters'

type Status = 'To request' | 'Requested' | 'Allowlisted'
interface Req {
  id: number; retailer: string; retailer_slug: string; market: string; market_code: string; period: string
  site: string; reason: string; user_agent: string; qids: string[]; status: Status; contact: string; note: string
  history: { at: string; by: string; status: string; note: string }[]
  created_at: string | null; updated_at: string | null; email: { subject: string; body: string }
}
interface Data { requests: Req[]; counts: Record<Status, number> }
const TABS: Status[] = ['To request', 'Requested', 'Allowlisted']
const STEP: Record<Status, number> = { 'To request': 0, Requested: 1, Allowlisted: 2 }

/** Admin: sites that blocked our crawler, and the allowlisting request to each retailer. */
export default function AccessRequests() {
  const { retailer, market } = useFilters()
  const [scope, setScope] = useState<'all' | 'current'>('all')
  const qs = new URLSearchParams(scope === 'all' ? { scope } : { scope, retailer, market })
  const q = useQuery({ queryKey: ['access-requests', scope, retailer, market], queryFn: () => getJSON<Data>(`/api/admin/access-requests?${qs}`), placeholderData: (p) => p })
  return (
    <>
      <PageHeader actions={<Segmented label="Which accounts" value={scope} onChange={setScope} options={[{ value: 'all', label: 'All accounts' }, { value: 'current', label: 'Header selection' }]} />} />
      <Query q={q}>{(d) => <View d={d} />}</Query>
    </>
  )
}

function View({ d }: { d: Data }) {
  const [tab, setTab] = useState<Status>('To request')
  const list = d.requests.filter((r) => r.status === tab)
  return (
    <>
      <p className="lede-line">
        When a retailer’s site blocks our crawler, the checks it affects are rated <RatingChip rating="blocked" size="sm" /> and left out of the score.
        Send the retailer an allowlisting request; once they confirm, mark it Allowlisted and the checks run again in the next cycle.
      </p>
      <Panel>
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t, label: `${t} · ${d.counts[t] ?? 0}` }))} />
        {list.length === 0 ? (
          <Empty title={tab === 'To request' ? 'No site is blocking our crawler right now.' : `No requests are ${tab.toLowerCase()}.`} />
        ) : (
          <ul className="areq-list">{list.map((r) => <Card key={r.id} r={r} />)}</ul>
        )}
      </Panel>
    </>
  )
}

function Card({ r }: { r: Req }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [contact, setContact] = useState(r.contact)
  const [note, setNote] = useState('')
  const [showEmail, setShowEmail] = useState(r.status === 'To request')
  const act = useMutation({
    mutationFn: (status: Status) => send('POST', `/api/admin/access-requests/${r.id}`, { status, note, contact }),
    onSuccess: (_x, status) => {
      toast('ok', status === 'Allowlisted'
        ? `${r.retailer} · ${r.market}: allowlisted. The ${r.qids.length} checks are queued for the next run.`
        : `${r.retailer} · ${r.market}: marked ${status.toLowerCase()}.`)
      setNote('')
      qc.invalidateQueries()
    },
    onError: (e) => toast('error', (e as Error).message),
  })
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Subject: ${r.email.subject}\n\n${r.email.body}`); toast('ok', 'Email copied to the clipboard.') } catch { toast('error', 'Copy is not available in this browser.') }
  }
  const mailto = `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent(r.email.subject)}&body=${encodeURIComponent(r.email.body)}`
  const closed = r.status === 'Allowlisted'

  return (
    <li className="areq">
      <div className="areq__head">
        <div>
          <span className="areq__who">{r.retailer} · {r.market}</span>
          <h3 className="areq__site">{r.site}</h3>
          <span className="muted">Blocked in {fmtPeriod(r.period, true)} · {r.qids.length} checks affected</span>
        </div>
        <ol className="areq__steps" aria-label="Progress">
          {TABS.map((t, i) => <li key={t} className={i < STEP[r.status] ? 'is-done' : i === STEP[r.status] ? 'is-on' : ''}><span>{i < STEP[r.status] ? <Checkmark20Regular /> : i + 1}</span>{t}</li>)}
        </ol>
      </div>

      <dl className="areq__facts">
        <div><dt>What happened</dt><dd>{r.reason}</dd></div>
        <div><dt>Crawler user agent</dt><dd><code>{r.user_agent}</code></dd></div>
        <div><dt>Checks affected</dt><dd className="flag__qs">{r.qids.map((q) => <span key={q} className="qid-chip">{q}</span>)}</dd></div>
        {r.note && <div><dt>Latest note</dt><dd>{r.note}</dd></div>}
      </dl>

      {!closed && (
        <div className="areq__act">
          <label className="field"><span>Retailer contact (email)</span>
            <input className="input" type="email" placeholder="web team or account contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <label className="field areq__note"><span>Note (optional)</span>
            <input className="input" placeholder={r.status === 'To request' ? 'e.g. Sent to the account team' : 'e.g. Confirmed by the retailer’s web team'} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="areq__btns">
            <button type="button" className="btn" onClick={() => setShowEmail((s) => !s)}><Mail20Regular />{showEmail ? 'Hide email' : 'Show email'}</button>
            {r.status === 'To request' && (
              <button type="button" className="btn btn--primary" disabled={act.isPending} onClick={() => act.mutate('Requested')}><Send20Regular />Mark as requested</button>
            )}
            <button type="button" className={`btn ${r.status === 'Requested' ? 'btn--primary' : ''}`} disabled={act.isPending}
              onClick={() => { if (window.confirm(`Mark ${r.site} as allowlisted? The ${r.qids.length} blocked checks move to Not yet checked and run in the next cycle.`)) act.mutate('Allowlisted') }}>
              <Checkmark20Regular />Mark as allowlisted
            </button>
          </div>
        </div>
      )}

      {showEmail && !closed && (
        <div className="areq__email">
          <div className="areq__email-bar">
            <span>Email draft · <b>{r.email.subject}</b></span>
            <span className="areq__email-btns">
              <button type="button" className="btn btn--subtle" onClick={copy}><Copy16Regular />Copy</button>
              <a className="btn btn--subtle" href={mailto}><Mail20Regular />Open in email</a>
            </span>
          </div>
          <pre>{r.email.body}</pre>
        </div>
      )}

      {r.history.length > 0 && (
        <details className="areq__hist">
          <summary>History · {r.history.length}</summary>
          <ul>{[...r.history].reverse().map((h, i) => <li key={i}><b>{h.status}</b> · {fmtDate(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}</li>)}</ul>
        </details>
      )}
    </li>
  )
}
