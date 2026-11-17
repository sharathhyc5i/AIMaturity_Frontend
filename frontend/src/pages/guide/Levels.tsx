import { motion } from "framer-motion";
import { Query } from "../../components/Query";
import { RatingsTable } from "../../components/RatingsTable";
import { PageHeader, Panel, StatusChip } from "../../components/ui";
import { useGuide, useMeta } from "../../lib/api";
import { DIM_COLOR } from "../../lib/constants";
import "../../components/OverallRating.css";

interface Data {
  levels: {
    level: number;
    name: string;
    stage: string;
    meaning: string;
    min_evidence: string;
  }[];
  requirements: { dimension: string; level: number; requirement: string }[];
  scoring: {
    rule: string;
    labels: string;
    excluded: string;
    inference: string;
    weights: Record<string, number>;
    threshold: number;
  };
  status_definitions: { status: string; meaning: string; open: string }[];
}

/** The three stages and the levels each covers, as on the AI Maturity Score card. */
const STAGES = [
  { stage: "Crawl", levels: "Levels 1–2", span: 2 },
  { stage: "Walk", levels: "Level 3", span: 1 },
  { stage: "Run", levels: "Levels 4–5", span: 2 },
];

export default function Levels() {
  const q = useGuide<Data>("levels");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

function View({ d }: { d: Data }) {
  const { data: meta } = useMeta();
  return (
    <>
      <PageHeader lede="The same five levels apply to every retailer. Levels 1–2 are Crawl, Level 3 is Walk, Levels 4–5 are Run." />

      {/* Which levels make up each stage, above the five level cards */}
      <div className="stages" aria-hidden="true">
        {STAGES.map((s) => (
          <div
            key={s.stage}
            className={`stages__band stages__band--${s.stage.toLowerCase()}`}
            style={{ gridColumn: `span ${s.span}` }}
          >
            <span className={`overall__pill overall__pill--${s.stage.toLowerCase()}`}>{s.stage}</span>
            <span>{s.levels}</span>
          </div>
        ))}
      </div>

      <div className="steps" role="list">
        {d.levels.map((l, i) => (
          <motion.div
            key={l.level}
            role="listitem"
            className={`step step--${l.stage.toLowerCase()}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.45, ease: [0, 0, 0, 1] }}
          >
            <div className="step__top">
              <span className="step__n">{l.level}</span>
              {/* A five-step ladder filled up to this level */}
              <span className="step__ladder" aria-hidden="true">
                {d.levels.map((x) => (
                  <i key={x.level} className={x.level <= l.level ? "is-on" : ""} style={{ height: `${30 + x.level * 14}%` }} />
                ))}
              </span>
            </div>
            <h3 className="step__name">
              {l.name}
              <span className={`overall__pill overall__pill--${l.stage.toLowerCase()} step__pill`}>{l.stage}</span>
            </h3>
            <p className="step__meaning">{l.meaning}</p>
            <div className="step__min">
              <span className="step__min-h">Least evidence that earns it</span>
              <p>{l.min_evidence}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid-2 aa-row">
        <Panel title="The scoring decision">
          <p className="rule rule--callout">{d.scoring.rule}</p>
          <dl className="dl" style={{ marginTop: 14 }}>
            <dt>Labels</dt>
            <dd>{d.scoring.labels}</dd>
            <dt>Left out</dt>
            <dd>{d.scoring.excluded}</dd>
            <dt>Inference</dt>
            <dd>{d.scoring.inference}</dd>
          </dl>
        </Panel>
        <Panel title="Reading a label">
          <div className="label-demo">
            <span className="label-demo__v">
              1<span>.40</span>
              <span className="h-flag">H</span>
            </span>
            <ul>
              <li>
                <b>1</b> highest level met in sequence
              </li>
              <li>
                <b>.40</b> 40% of the way to Level 2’s threshold
              </li>
              <li>
                <b>H</b> key evidence older than 12 months
              </li>
            </ul>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            All scores are public-evidence assessments. Weights by default:{" "}
            {["Yes", "Partial", "Issue", "No", "Not disclosed"]
              .map((k) => `${k} ${d.scoring.weights[k]}`)
              .join(" · ")}
            ; threshold {d.scoring.threshold}%.
          </p>
        </Panel>
      </div>

      <Panel
        pad={false}
        className="aa-row"
        title="What each level requires"
        sub="By dimension. D4 combines operating model and measurement: a level is met only when both parts are met."
      >
        <div className="table-wrap">
          <table className="table req">
            <thead>
              <tr>
                <th>Dimension</th>
                {d.levels.map((l) => (
                  <th key={l.level}>
                    <span className="req__h">
                      Level {l.level}
                      <span className={`overall__pill overall__pill--${l.stage.toLowerCase()} step__pill`}>
                        {l.stage}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(meta?.dimensions.map((x) => x.code) ?? []).map((dc) => (
                <tr key={dc}>
                  <th scope="row">
                    <span className="dimcode" style={{ color: DIM_COLOR[dc] }}>
                      {dc}
                    </span>
                    <small>
                      {meta?.dimensions.find((x) => x.code === dc)?.short}
                    </small>
                  </th>
                  {d.requirements
                    .filter((r) => r.dimension === dc)
                    .map((r) => (
                      <td key={r.level}>{r.requirement}</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        pad={false}
        className="aa-row"
        title="Ratings"
        sub="How every question and site check is rated. The same scale is used for every retailer."
      >
        <RatingsTable />
      </Panel>

      <Panel
        pad={false}
        className="aa-row"
        title="C5i statuses behind each rating"
        sub="The statuses the agent records. Not disclosed scores 0 and counts, like No, so it is rated Needs Optimization."
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Meaning</th>
                <th>Is anything still open?</th>
              </tr>
            </thead>
            <tbody>
              {d.status_definitions.map((s) => (
                <tr key={s.status}>
                  <td>
                    <StatusChip status={s.status} size="sm" showStatus />
                  </td>
                  <td className="wrap-sm">{s.meaning}</td>
                  <td className="wrap-sm">{s.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
