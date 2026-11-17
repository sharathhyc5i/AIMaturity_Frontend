import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorState, Loading } from './ui'

/** Render loading / error / data for a query. While the filters change, the loading state shows
 *  until the new data arrives, so the previous retailer's data is never shown under the new one. */
export function Query<T>({ q, rows, children }: { q: UseQueryResult<T>; rows?: number; children: (data: T) => ReactNode }) {
  if (q.error && !q.data) return <ErrorState error={q.error} retry={() => q.refetch()} />
  if (!q.data || (q.isFetching && q.isPlaceholderData)) return <Loading rows={rows} />
  return <div>{children(q.data)}</div>
}
