import { Copy16Regular, LockClosed16Regular, Open16Regular } from '@fluentui/react-icons'
import { useState } from 'react'
import { useScoped, type Info } from '../lib/api'
import { RATING, type RatingId } from '../lib/constants'
import { useToast } from './feedback'
import { Loading, Modal, RatingChip, StatusChip } from './ui'

interface Check {
  n: number; id: string; name: string; what: string; rating: RatingId; summary: string; pending: number; fix: string
  robots: string | null
  questions: { qid: string; text: string; level: number | null; status: string; rating: RatingId; finding: string; sources: string[] }[]
}
interface Data {
  info: Info; site: string; checks: Check[]; counts: Partial<Record<RatingId, number>>
  access: { id: number; status: string; reason: string; updated_at: string | null } | null
}

/** Six technical AI-search checks for the retailer and country in the header, rated on the retailer rating scale. */
export function SiteChecks({ onShowQuestions }: { onShowQuestions: (name: string, qids: string[]) => void }) {
  const q = useScoped<Data>('/api/site-checks')
  const [open, setOpen] = useState<Check | null>(null)
  const d = q.data
  return (
    <section className="schk aa-row" aria-labelledby="schk-title">
      <header className="schk__top">
        <div>
          <h2 id="schk-title" className="schk__title">Site checks</h2>
          <p className="schk__sub">Technical AI-search checks on {d ? d.site : 'the retailer’s site'}. Each check is answered by the questions below, so it never counts twice. Select a check for the detail and the fix.</p>
        </div>
        {d && (
          <ul className="schk__tally" aria-label="Ratings">
            {(['good', 'okay', 'needs', 'blocked', 'pending'] as RatingId[]).filter((r) => d.counts[r]).map((r) => (
              <li key={r}><i className={`schk__dot schk__dot--${r}`} style={{ background: RATING[r].color }} />{RATING[r].label} <b>{d.counts[r]}</b></li>
            ))}
          </ul>
        )}
      </header>

      {!d ? <Loading rows={1} /> : (
        <>
          {d.access && d.checks.some((c) => c.rating === 'blocked') && <BlockedNote d={d} />}
          <ul className="schk__grid">
            {d.checks.map((c) => {
              const r = RATING[c.rating]
              return (
                <li key={c.id}>
                  <button type="button" className={`schk-card schk-card--${c.rating}`} style={{ ['--rc' as string]: r.color }} onClick={() => setOpen(c)}
                    aria-label={`${c.name}: ${r.label}. Open the detail`}>
                    <span className="schk-card__n">{c.n}</span>
                    <span className="schk-card__name">{c.name}</span>
                    <RatingChip rating={c.rating} size="sm" />
                    <span className="schk-card__sum">{c.summary}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} wide
        title={open && <div className="dm-title"><span className="dm-title__code schk-modal__n">{open.n}</span><h2>{open.name}</h2></div>}
        actions={open && <RatingChip rating={open.rating} />}>
        {open && d && <Detail c={open} d={d} onShowQuestions={() => { onShowQuestions(open.name, open.questions.map((x) => x.qid)); setOpen(null) }} />}
      </Modal>
    </section>
  )
}

function BlockedNote({ d }: { d: Data }) {
  return (
    <div className="schk__blocked" role="note">
      <LockClosed16Regular />
      <span>
        <b>Our crawler was blocked on {d.site}.</b> {d.access!.reason} These checks are left out of the score until the retailer allowlists the crawler.
        {' '}Allowlisting request: <b>{d.access!.status}</b>.
      </span>
    </div>
  )
}

function Detail({ c, d, onShowQuestions }: { c: Check; d: Data; onShowQuestions: () => void }) {
  const r = RATING[c.rating]
  const toast = useToast()
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast('ok', 'Copied to the clipboard.') } catch { toast('error', 'Copy is not available in this browser.') }
  }
  return (
    <div className="dm schk-detail">
      <section className="dm-card">
        <h3 className="dm-card__title">What it checks</h3>
        <p>{c.what}</p>
        <dl className="dm-facts">
          <div><dt>Rating</dt><dd>{r.label}</dd></div>
          <div><dt>Scoring</dt><dd>{r.scoring === '0' || r.scoring === '0.5' || r.scoring === '1' ? `${r.scoring} per question` : r.scoring}</dd></div>
          <div className="dm-facts__wide"><dt>Action</dt><dd>{r.action}</dd></div>
        </dl>
      </section>

      <section className="dm-card">
        <h3 className="dm-card__title">{c.rating === 'blocked' ? 'Why it could not be assessed' : 'Recommended fix'}</h3>
        {c.rating === 'blocked' ? (
          <>
            <p>{c.summary}</p>
            <p className="muted">Request: <b>{d.access?.status ?? 'To request'}</b>. Once the retailer allowlists the crawler, these checks run in the next cycle.</p>
          </>
        ) : c.rating === 'pending' ? <p>{c.summary} {c.fix}</p> : c.rating === 'good' ? <p>No fix needed. Re-check monthly.</p> : <p>{c.fix}</p>}
        {c.robots && (
          <div className="schk-code">
            <div className="schk-code__bar"><span>robots.txt · ready to paste</span><button type="button" className="btn btn--subtle" onClick={() => copy(c.robots!)}><Copy16Regular />Copy</button></div>
            <pre>{c.robots}</pre>
          </div>
        )}
      </section>

      <section className="dm-card dm-card--wide">
        <h3 className="dm-card__title">Questions behind this check<span className="dm-card__sub">{c.questions.length} question{c.questions.length === 1 ? '' : 's'}{c.pending ? ` · ${c.pending} not yet checked` : ''}</span></h3>
        <ul className="dm-qs schk-qs">
          {c.questions.map((x) => (
            <li key={x.qid} className="dm-qs__item">
              <div className="dm-qs__top"><span className="qid-inline">{x.qid}</span><StatusChip status={x.status} size="sm" showStatus />{x.level != null && <span className="muted">Level {x.level}</span>}{x.sources.length > 0 && <span className="srcs">{x.sources.map((s) => <code key={s}>{s}</code>)}</span>}</div>
              <p className="dm-qs__q">{x.text}</p>
              <p className="dm-qs__f">{x.finding}</p>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--subtle schk-detail__more" onClick={onShowQuestions}><Open16Regular />Show these questions in the table</button>
      </section>
    </div>
  )
}
