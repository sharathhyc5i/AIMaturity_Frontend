import { SignOut20Regular } from '@fluentui/react-icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'

function initials(name: string, email: string) {
  const src = name.trim() || email.split('@')[0].replace(/[._-]+/g, ' ')
  return src.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

export function UserMenu() {
  const { me, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])
  if (!me) return null
  return (
    <div className="um" ref={ref}>
      {/* <button type="button" className="icon-btn um__signout" onClick={signOut} aria-label="Sign out" title="Sign out"><SignOut20Regular /></button> */}
      <button type="button" className="um__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`Account: ${me.name || me.email}`}>
        <span className="um__avatar" aria-hidden="true">{initials(me.name, me.email)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="um__pop" role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <div className="um__who">
              <span className="um__avatar um__avatar--lg" aria-hidden="true">{initials(me.name, me.email)}</span>
              <div>
                <b>{me.name || me.email.split('@')[0]}</b>
                <small>{me.email}</small>
                <span className={`pill ${me.role === 'admin' ? 'pill--violet' : 'pill--blue'}`}>{me.role === 'admin' ? 'Admin' : 'User'}</span>
              </div>
            </div>
            {/* {config?.mode === 'local' && <p className="um__dev">Local mode: no sign-in. Microsoft sign-in is used on Azure.</p>} */}
            <button type="button" role="menuitem" className="um__item" onClick={signOut}><SignOut20Regular />Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
