import { Calendar20Regular, ChevronDown20Regular, ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { fmtPeriod, monthShort } from '../lib/constants'

/** Month-granularity date picker. Months without an assessment are disabled. */
export function MonthPicker({ value, available, workflow, onChange }: {
  value: string; available: string[]; workflow: string[]; onChange: (p: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear())
  const wrap = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => { if (value) setYear(Number(value.slice(0, 4))) }, [value])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLButtonElement>('.mp__cell.is-selected, .mp__cell:not(:disabled)')?.focus())
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const years = available.map((p) => Number(p.slice(0, 4)))
  const minY = Math.min(...years), maxY = Math.max(...years)

  return (
    <div className="dd mp" ref={wrap}>
      <span className="dd__label" id={`${id}-l`}>Month</span>
      <button type="button" className="dd__btn" aria-haspopup="dialog" aria-expanded={open} aria-labelledby={`${id}-l ${id}-v`}
        onClick={() => setOpen((o) => !o)}>
        <span className="dd__icon"><Calendar20Regular /></span>
        <span className="dd__value" id={`${id}-v`}>{value ? fmtPeriod(value) : 'Choose…'}</span>
        <ChevronDown20Regular className={`dd__chev ${open ? 'is-open' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="mp__pop" role="dialog" aria-label="Choose a month"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0, 0, 0, 1] }}>
            <div className="mp__head">
              <button type="button" className="icon-btn" aria-label="Previous year" disabled={year <= minY} onClick={() => setYear((y) => y - 1)}>
                <ChevronLeft20Regular />
              </button>
              <strong aria-live="polite">{year}</strong>
              <button type="button" className="icon-btn" aria-label="Next year" disabled={year >= maxY} onClick={() => setYear((y) => y + 1)}>
                <ChevronRight20Regular />
              </button>
            </div>
            <div className="mp__grid" role="grid">
              {monthShort.map((m, i) => {
                const p = `${year}-${String(i + 1).padStart(2, '0')}`
                const has = available.includes(p)
                const sel = p === value
                return (
                  <button key={m} type="button" role="gridcell" disabled={!has} aria-selected={sel}
                    className={`mp__cell ${sel ? 'is-selected' : ''}`}
                    aria-label={`${fmtPeriod(p, true)}${has ? (workflow.includes(p) ? ', workflow run' : ', assessment') : ', no assessment'}`}
                    onClick={() => { onChange(p); setOpen(false) }}>
                    {m}
                    {has && <i className={`mp__dot ${workflow.includes(p) ? 'is-real' : ''}`} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            {/* <div className="mp__legend">
              <span><i className="mp__dot is-real" /> Workflow run</span>
              <span><i className="mp__dot" /> Assessment</span>
            </div> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
