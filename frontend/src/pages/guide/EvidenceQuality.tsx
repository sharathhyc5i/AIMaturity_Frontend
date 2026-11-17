import { Query } from "../../components/Query";
import { PageHeader, Panel, StatusChip } from "../../components/ui";
import { useGuide } from "../../lib/api";

interface Data {
  fields: { field: string; content: string }[];
  confidence: { level: string; meaning: string }[];
  conflicts: { rule: string; action: string }[];
  status_definitions: { status: string; meaning: string; open: string }[];
}
const CONF: Record<string, string> = {
  High: "pill--green",
  Medium: "pill--blue",
  Low: "pill--amber",
  U: "",
};

export default function EvidenceQuality() {
  const q = useGuide<Data>("evidence-quality");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

function View({ d }: { d: Data }) {
  return (
    <>
      <PageHeader lede="Every evidence record carries seven fields. Missing information is recorded as a limit, never filled in by inference." />
      <Panel
        title="What every evidence record must carry"
        sub={`${d.fields.length} required fields`}
      >
        <ol className="fields">
          {d.fields.map((f, i) => (
            <li key={f.field}>
              <span className="fields__n">{i + 1}</span>
              <div>
                <b>{f.field}</b>
                <p>{f.content}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="grid-2 aa-row">
        <Panel
          title="Confidence levels"
          sub="Confidence describes evidence strength and is separate from maturity."
        >
          <ul className="rows">
            {d.confidence.map((c) => (
              <li key={c.level} className="conf-row">
                <span className={`pill ${CONF[c.level]}`}>
                  {c.level === "U" ? "U · Unknown" : c.level}
                </span>
                <p>{c.meaning}</p>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 10 }}>
            A company announcement reproduced by its supplier can strengthen
            relationship confirmation but does not independently verify
            outcomes.
          </p>
        </Panel>
        <Panel title="When evidence conflicts">
          <ul className="rows">
            {d.conflicts.map((c) => (
              <li key={c.rule}>
                <b>{c.rule}</b>
                <p className="muted">{c.action}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        pad={false}
        className="aa-row"
        title="Missing information, by status"
        sub="How a missing or partial answer is recorded, and whether work is still open."
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
