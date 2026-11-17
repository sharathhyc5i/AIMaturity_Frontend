import { RATINGS } from '../lib/constants'
import { RatingChip } from './ui'

/** The rating scale: what each rating means, the C5i status behind it, how it scores and what happens next.
 *  A table on wide screens; one card per rating on phones. */
export function RatingsTable() {
  return (
    <div className="table-wrap rtable">
      <table className="table ratings">
        <thead>
          <tr><th>Rating</th><th>Colour</th><th>Meaning</th><th>C5i status it maps to</th><th>Scoring</th><th>Action</th></tr>
        </thead>
        <tbody>
          {RATINGS.map((r) => (
            <tr key={r.id}>
              <td data-label="Rating"><RatingChip rating={r.id} size="sm" /></td>
              <td data-label="Colour" className="nowrap">{r.colorName}</td>
              <td data-label="Meaning" className="wrap-sm">{r.meaning}</td>
              <td data-label="C5i status" className="wrap-sm">{r.maps}</td>
              <td data-label="Scoring" className="nowrap">{r.scoring}</td>
              <td data-label="Action" className="wrap-sm">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
