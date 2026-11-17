import { useState } from "react";
import { ChevronDown16Regular } from "@fluentui/react-icons";
import { RatingsTable } from "./RatingsTable";
import { RatingChip } from "./ui";
import { RATINGS } from "../lib/constants";

/** What each colour on the cards means: the retailer rating scale. */
export function RatingsKey({ className = "" }: { className?: string } = {}) {
  // Collapsed by default: the chips stay visible, the full table opens on demand
  const [open, setOpen] = useState(false);
  return (
    <section className={`ckey ${className}`.trim()} aria-label="Ratings and what the colours mean">
      <div className="ckey__group">
        <button
          type="button"
          className="ckey__toggle"
          aria-expanded={open}
          aria-controls="ratings-table"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown16Regular className="ckey__chev" aria-hidden="true" />
          <span className="ckey__title">Ratings</span>
          <span className="ckey__hint">
            {open
              ? "Hide meaning, scoring and action"
              : "Show meaning, scoring and action"}
          </span>
        </button>
        {open ? (
          <div id="ratings-table">
            <RatingsTable />
          </div>
        ) : (
          <ul className="ckey__chips" aria-label="Ratings">
            {RATINGS.map((r) => (
              <li key={r.id}>
                <RatingChip rating={r.id} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
