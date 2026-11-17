import { CheckmarkCircle20Regular, Dismiss20Regular, ErrorCircle20Regular } from '@fluentui/react-icons'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* ---------- Toasts ---------- */
interface Toast { id: number; kind: 'ok' | 'error'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const n = useRef(0)
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++n.current
    setItems((t) => [...t, { id, kind, text }])
    window.setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          <AnimatePresence>
            {items.map((t) => (
              <motion.div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                {t.kind === 'ok' ? <CheckmarkCircle20Regular /> : <ErrorCircle20Regular />}
                <span>{t.text}</span>
                <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}><Dismiss20Regular /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ open, title, body, confirmLabel, danger = true, onConfirm, onCancel, busy }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; busy?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    ref.current?.focus()
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onCancel])
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }} transition={{ duration: 0.18 }}>
            <h2 id="dlg-t">{title}</h2>
            <div className="dialog__body">{body}</div>
            <div className="dialog__actions">
              <button type="button" className="btn" onClick={onCancel}>Cancel</button>
              <button type="button" ref={ref} className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
