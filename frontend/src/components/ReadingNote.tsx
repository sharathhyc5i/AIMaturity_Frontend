import { ChevronDown20Regular, Info20Regular } from '@fluentui/react-icons'
import { useId, useState } from 'react'
import { useScoped, type Info } from '../lib/api'

export interface ReadingGuide { info: Info; items: { topic: string; text: string }[] }

/** The client-safe reading guide for the view picked in the header. */
export function useReadingGuide() {
  return useScoped<ReadingGuide>('/api/reading-guide')
}

/** “How to read these results”: a short, client-safe method note, folded by default. */
export function ReadingNote() {
  const q = useReadingGuide()
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!q.data) return null
  return (
    <section className={`rnote aa-row ${open ? 'is-open' : ''}`}>
      <button type="button" className="rnote__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Info20Regular className="rnote__icon" />
        <span className="rnote__title">How to read these results</span>
        <span className="rnote__hint">{open ? 'Hide' : 'Evidence, scoring, freshness and market'}</span>
        <ChevronDown20Regular className="rnote__chev" />
      </button>
      {open && (
        <dl className="rnote__list" id={id}>
          {q.data.items.map((i) => (
            <div key={i.topic}>
              <dt>{i.topic}</dt>
              <dd>{i.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
