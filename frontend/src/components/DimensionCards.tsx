import { DIM_COLOR, DIM_TINT } from "../lib/constants";
import type { DimCode, Score } from "../lib/api";
import { StackBar } from "./ui";

/** One dimension's question outcomes, as returned by /api/outcomes. */
export interface OutcomeDim {
  dimension: DimCode;
  score: Score;
  total: number;
  status: Record<string, number>;
  maturity_status: Record<string, number>;
  lens: Record<string, number>;
  themes: { name: string; total: number; status: Record<string, number> }[];
}

/** One card per dimension: score, status mix and question count.
 *  Clicking a card selects it and shows its sub-themes and scorecard below. */
export function DimensionCards({
  dimensions,
  name,
  active = null,
  onSelect,
}: {
  dimensions: OutcomeDim[];
  name: (code: DimCode) => string;
  active?: DimCode | null;
  onSelect: (code: DimCode) => void;
}) {
  return (
    <div className="dimrows">
      {dimensions.map((x) => (
        <div key={x.dimension} className="dimrow-cell">
          <button
            type="button"
            className={`dimrow ${active === x.dimension ? "is-on" : ""}`}
            style={{
              ["--dc" as string]: DIM_COLOR[x.dimension],
              ["--dt" as string]: DIM_TINT[x.dimension],
            }}
            onClick={() => onSelect(x.dimension)}
            aria-pressed={active === x.dimension}
          >
            <span className="dimrow__head">
              <b>{x.dimension}</b>
              <span>{name(x.dimension)}</span>
            </span>
            <span className="dimrow__score">{x.score.label}</span>
            <span className="dimrow__bar">
              <StackBar counts={x.status} height={8} />
            </span>
            <span className="dimrow__meta">
              {x.total} questions
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
