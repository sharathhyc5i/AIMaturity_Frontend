import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { ToastProvider } from './components/feedback'
import { DEFAULT_RETAILER } from './lib/headerOptions'
import './index.css'
import './components/shell.css'
import './components/ui.css'
import './pages/pages.css'
import './pages/admin.css'
import './components/access.css'

// Every visit starts on the default retailer (Best Buy) and the current month (DEFAULT_PERIOD on the
// API): a link or an old tab that names another retailer or month is rewritten before the app starts.
// Picking a retailer or month in the header still switches for the visit.
{
  const url = new URL(window.location.href)
  const named = url.searchParams.get('retailer')
  let changed = false
  if (named && named !== DEFAULT_RETAILER) {
    url.searchParams.set('retailer', DEFAULT_RETAILER)
    url.searchParams.delete('market') // the default retailer's own market is picked instead
    changed = true
  }
  if (url.searchParams.has('period')) {
    url.searchParams.delete('period') // the header then picks the API's default month
    changed = true
  }
  if (url.searchParams.has('sku')) {
    url.searchParams.delete('sku') // old name of the lob parameter; the header sets lob
    changed = true
  }
  if (changed) window.history.replaceState(window.history.state, '', url)
}

const client = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Animations always play: framer-motion ignores the OS "reduce motion" setting */}
    <MotionConfig reducedMotion="never">
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
)
