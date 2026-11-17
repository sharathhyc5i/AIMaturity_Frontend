import { useState } from "react";
import { Query } from "../../components/Query";
import { QuestionTable, type SourceRef } from "../../components/QuestionTable";
import type { OutcomeDim } from "../../components/DimensionCards";
import { DemoNotice, PageHeader, Panel, Tabs } from "../../components/ui";
import { useScoped, type DimCode, type Info, type QRow } from "../../lib/api";

interface Data {
  info: Info;
  dimensions: OutcomeDim[];
  questions: QRow[];
  sources: Record<string, SourceRef>;
}

export default function QuestionsByDimension() {
  const q = useScoped<Data>("/api/outcomes");
  return <Query q={q}>{(d) => <View d={d} />}</Query>;
}

function View({ d }: { d: Data }) {
  const [tab, setTab] = useState<"all" | DimCode>("all");
  const rows = d.questions.filter(
    (r) => r.in_run && (tab === "all" || r.dimension === tab),
  );

  return (
    <>
      <PageHeader info={d.info} />
      <DemoNotice info={d.info} />

      <Panel
        className="aa-row"
        title="Questions and outcomes"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all", label: "All" },
              ...d.dimensions.map((x) => ({
                value: x.dimension,
                label: x.dimension,
              })),
            ]}
          />
        }
      >
        <QuestionTable
          key={tab}
          rows={rows}
          scorecard
          sources={d.sources}
          hideDim={tab !== "all"}
        />
      </Panel>
    </>
  );
}
