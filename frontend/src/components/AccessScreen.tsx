import { ErrorCircle20Regular, LockClosed20Regular } from '@fluentui/react-icons'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { MicrosoftLogo } from './BrandLogo'

/**
 * Shown only when the app cannot let someone in: their email is not allowed or an
 * admin removed them, or sign-in is not working. There is no sign-in form: locally
 * the API signs you in as LOCAL_USER_EMAIL, and on Azure Microsoft does the sign-in.
 */
export function AccessScreen() {
  const { status, config, error, signOut, signIn } = useAuth()
  const domains = (config?.allowed_domains ?? ['c5i.ai', 'course5i.com']).map((d) => `@${d}`).join(' or ')
  const microsoft = config?.mode === 'microsoft'
  const denied = status === 'denied'

  return (
    <div className="access">
      <div className="access__bg" aria-hidden="true">
        <span className="access__pane access__pane--a" />
        <span className="access__pane access__pane--b" />
        <span className="access__pane access__pane--c" />
        <span className="access__pane access__pane--d" />
        <span className="access__ray access__ray--a" />
        <span className="access__ray access__ray--b" />
      </div>
      <motion.div className="access__card" role="alert" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0, 0, 0, 1] }}>
        <MicrosoftLogo height={24} />
        <h1 className="access__title">{denied ? 'You don’t have access yet' : 'Retail AI readiness can’t open'}</h1>
        <div className={`access__alert ${denied ? '' : 'access__alert--error'}`}>
          {denied ? <LockClosed20Regular /> : <ErrorCircle20Regular />}
          <p>{error ?? 'Something went wrong.'}{!denied && status === 'error' && '. Check that the API is running, then reload the page.'}</p>
        </div>
        <p className="access__hint">
          {denied ? `People with a ${domains} account can use the app. An admin can add anyone else in Admin › Users.` : 'If this keeps happening, contact an admin.'}
        </p>
        <div className="access__actions">
          {microsoft && denied && <button type="button" className="access__btn access__btn--ghost" onClick={signOut}>Use another account</button>}
          {microsoft && status === 'signedOut' && <button type="button" className="access__btn" onClick={signIn}>Sign in</button>}
          <button type="button" className="access__btn" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </motion.div>
    </div>
  )
}
