import { useQuery } from '@tanstack/react-query'
import { authHeader, useAuth } from './auth'
import { useFilters } from './filters'

export { API_BASE, apiUrl } from './apiBase'
import { apiUrl } from './apiBase'

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = { ...(init?.headers as Record<string, string> | undefined), ...(await authHeader()) }
  // credentials: the App Service sign-in cookie must travel with each request when the API is on another site
  const res = await fetch(apiUrl(path), { credentials: 'include', ...init, headers })
  if (res.status === 401) window.dispatchEvent(new Event('auth:expired'))
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch { /* not JSON */ }
    throw new Error(detail)
  }
  return regionNames(await res.json()) as T
}

/** Market names shown as their region on every page: "United States" reads "Americas", as in the header. */
const REGION_OF_MARKET: Record<string, string> = { 'United States': 'Americas' }
const MARKET_KEYS = new Set(['market', 'market_name', 'marketName'])
function regionNames(v: unknown, key = '', parent = ''): unknown {
  if (typeof v === 'string')
    return MARKET_KEYS.has(key) || (key === 'name' && parent === 'market') ? (REGION_OF_MARKET[v] ?? v) : v
  if (Array.isArray(v)) return v.map((x) => regionNames(x, '', parent))
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, regionNames(x, k, key)]))
  return v
}

/* ---------- shared types ---------- */
export type Status = 'Yes' | 'Partial' | 'Issue' | 'No' | 'Not disclosed' | 'Access blocked' | 'Check pending' | 'N/A' | 'Not in run'
export type Lens = 'Maturity' | 'Competitive · vendor' | 'Competitive · retailer'
export type DimCode = string

export interface Meta {
  defaults: { retailer: string; market: string; period: string }
  retailers: {
    slug: string; name: string; route: number; segment: string; hq: string
    markets: { code: string; name: string; periods: string[]; workflow_periods: string[] }[]
  }[]
  dimensions: { code: DimCode; name: string; short: string; color: string; summary: string }[]
  levels: { level: number; name: string; stage: string }[]
  skus: { code: string; name: string }[]
}

export interface Cell {
  level: number; tested: boolean; n: number; total: number; weighted: number; pct: number | null
  inferred: boolean; yes: number; other: number; result: string
  /** Scorecard word: Met, Not met, Not disclosed, Unknown, or '' (blank) */
  gate: string; not_disclosed: number
}
export interface Score {
  dimension: DimCode; level: number; fraction: number; value: number; number: string; h: boolean
  label: string; key: string; stage: string; ceiling: number; cells: Cell[]
}
export interface Info {
  id: number
  retailer: { slug: string; name: string; route: number; segment: string }
  market: { code: string; name: string; currency: string }
  period: string; run_date: string; data_source: 'workflow' | 'illustrative' | 'not_run'; notes: string[]; peers: string[]
}
export interface QRow {
  qid: string; dimension: DimCode; sub_theme: string; text: string; lens: Lens; level: number | null
  change: string; evidence_type: string; how: string; answer_type: string; cadence: string; origin: string | null
  in_run: boolean; status: Status; finding: string; sources: string[]; flags: string[]
  /** Static 0-1 score for the question */
  score?: number | null
  /** Set when a list mixes several retailers' questions (Competitor comparison) */
  retailer?: string
}

/* ---------- hooks ---------- */
/** Send a JSON body (POST/PUT/PATCH/DELETE). */
export function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return getJSON<T>(path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
}

export function useMeta() {
  const { status } = useAuth()
  return useQuery({ queryKey: ['meta'], queryFn: () => getJSON<Meta>('/api/meta'), staleTime: Infinity, enabled: status === 'signedIn' })
}

/** Fetch an assessment-scoped endpoint with the current header filters. */
export function useScoped<T>(path: string) {
  const { retailer, market, period, sku, ready } = useFilters()
  const qs = new URLSearchParams({ retailer, market, period, sku }).toString()
  return useQuery({
    queryKey: [path, retailer, market, period, sku],
    queryFn: () => getJSON<T>(`${path}?${qs}`),
    enabled: ready,
    placeholderData: (prev) => prev,
  })
}

export function useGuide<T>(key: string) {
  return useQuery({ queryKey: ['guide', key], queryFn: () => getJSON<T>(`/api/guide/${key}`), staleTime: 60_000 })
}
