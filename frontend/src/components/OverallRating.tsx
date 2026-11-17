import type { Score } from "../lib/api";
import { withSampleScore } from "../lib/sample";
import "./OverallRating.css";

type Stage = "Crawl" | "Walk" | "Run";

/* Stages follow the level framework: Crawl = Levels 1–2, Walk = Level 3, Run = Levels 4–5. */
const stageOf = (level: number): Stage => (level >= 4 ? "Run" : level >= 3 ? "Walk" : "Crawl");

/* The scores each stage covers, as in the Levels guide; listed from the top stage down. */
const STAGE_DEFS: { stage: Stage; levels: string }[] = [
  { stage: "Run", levels: "4.00–5.00" },
  { stage: "Walk", levels: "3.00–3.99" },
  { stage: "Crawl", levels: "0.00–2.99" },
];

/** A small stick figure that crawls, walks or runs to match the stage. */
function Figure({ stage }: { stage: Stage }) {
  return (
    <svg
      className={`overall-fig overall-fig--${stage.toLowerCase()}`}
      viewBox="0 0 120 80"
      width="104"
      height="70"
    >
      {stage === "Crawl" ? (
        /* On hands and knees, facing right: arms swing from the shoulder, legs (thigh and shin)
           from the hip, each pair in turn */
        <g className="overall-fig__frame">
          <circle className="overall-fig__head" cx="88" cy="42" r="7" />
          <line className="overall-fig__torso" x1="78" y1="50" x2="46" y2="52" />
          <g className="overall-fig__limb overall-fig__limb--a" style={{ transformOrigin: "76px 50px" }}>
            <line x1="76" y1="50" x2="78" y2="70" />
          </g>
          <g className="overall-fig__limb overall-fig__limb--b" style={{ transformOrigin: "76px 50px" }}>
            <line x1="76" y1="50" x2="78" y2="70" />
          </g>
          <g className="overall-fig__limb overall-fig__limb--b" style={{ transformOrigin: "46px 52px" }}>
            <polyline points="46,52 50,70 32,70" />
          </g>
          <g className="overall-fig__limb overall-fig__limb--a" style={{ transformOrigin: "46px 52px" }}>
            <polyline points="46,52 50,70 32,70" />
          </g>
        </g>
      ) : (
      <g className="overall-fig__frame">
        <circle className="overall-fig__head" cx="60" cy="22" r="7" />
        <line className="overall-fig__torso" x1="60" y1="29" x2="60" y2="50" />
        <g className="overall-fig__limb overall-fig__limb--a" style={{ transformOrigin: "60px 34px" }}>
          <line x1="60" y1="34" x2="60" y2="47" />
        </g>
        <g className="overall-fig__limb overall-fig__limb--b" style={{ transformOrigin: "60px 34px" }}>
          <line x1="60" y1="34" x2="60" y2="47" />
        </g>
        <g className="overall-fig__limb overall-fig__limb--a" style={{ transformOrigin: "60px 50px" }}>
          <line x1="60" y1="50" x2="60" y2="68" />
        </g>
        <g className="overall-fig__limb overall-fig__limb--b" style={{ transformOrigin: "60px 50px" }}>
          <line x1="60" y1="50" x2="60" y2="68" />
        </g>
      </g>
      )}
      <line className="overall-fig__ground" x1="14" y1="72" x2="106" y2="72" />
    </svg>
  );
}

/** The AI Maturity Score card: the average of the dimension scores, its stage (figure and pill) and the
 *  Run / Walk / Crawl key. Clicking it shows the overall breakdown below, as a dimension card does. */
export function OverallRating({
  scores,
  retailer,
  selected = false,
  onSelect,
}: {
  scores: Score[];
  retailer: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  if (!scores.length) return null;
  const values = scores.map((s) => withSampleScore(retailer)(s).value);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const level = Math.min(5, Math.max(1, Math.floor(avg)));
  const stage = stageOf(level);

  return (
    <section
      className={`overall overall--${stage.toLowerCase()} ${onSelect ? "overall--click" : ""} ${selected ? "is-on" : ""}`}
      aria-label={`AI Maturity Score ${avg.toFixed(2)}, ${stage} stage${onSelect ? ". Show the overall breakdown below" : ""}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="overall__left" aria-hidden="true">
        <Figure stage={stage} />
        <span className={`overall__pill overall__pill--${stage.toLowerCase()}`}>{stage}</span>
      </div>
      <div className="overall__mid">
        <h3 className="overall__title">AI Maturity</h3>
        <p className="overall__value">{avg.toFixed(2)}</p>
        <p className="overall__note">
          * overall score is the average of the four dimension scores (D1–D4) seen below
        </p>
      </div>
      <ul className="overall__stages" aria-label="What Run, Walk and Crawl mean">
        {STAGE_DEFS.map((d) => (
          <li
            key={d.stage}
            className={`overall__range overall__range--${d.stage.toLowerCase()} ${d.stage === stage ? "is-on" : ""}`}
          >
            <b>{d.stage}</b>
            <span>{d.levels}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
