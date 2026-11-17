/**
 * Retailer-vs-competitor report, exported as a Word document or a PDF.
 * No extra packages: Word opens the HTML document directly (.doc), and the PDF is made
 * by the browser's print dialog ("Save as PDF").
 */
import type { Detail } from "../components/DimensionModal";
import { getJSON, type DimCode, type Info, type QRow } from "./api";
import { DIM_COLOR, fmtPeriod, ratingOf } from "./constants";
import type { QuestionSources } from "./sampleSources";

export interface Side {
  retailer: string;
  retailerName: string;
  market: string;
  marketName: string;
  dataSource: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
// Client-safe wording for where the levels come from
const sourceLabel = (s: string) =>
  s === "workflow"
    ? "Assessed"
    : s === "not_run"
      ? "Not assessed yet"
      : "Assessed";

/** Fetch the full scorecard of every dimension for one account. */
export async function loadSide(
  side: Side,
  period: string,
  dims: string[],
  sku = "",
): Promise<Detail[]> {
  return Promise.all(
    dims.map((d) =>
      getJSON<Detail>(
        `/api/dimension-detail?${new URLSearchParams({ dimension: d, retailer: side.retailer, market: side.market, period, sku })}`,
      ),
    ),
  );
}

function sideSection(side: Side, details: Detail[]) {
  return `
  <h2>${esc(side.retailerName)} · ${esc(side.marketName)} <span class="muted">(${esc(sourceLabel(side.dataSource))})</span></h2>
  ${details
    .map(
      (d) => `
    <h3 style="color:${esc(DIM_COLOR[d.dimension.code as DimCode])}">${esc(d.dimension.code)} · ${esc(d.dimension.name)}: ${esc(d.facts.score ? d.score.number.replace(/^L(?=\d)/, "") : "Not established")}${d.facts.stale ? " H" : ""}</h3>
    <p class="muted">${esc(d.facts.score ? `${d.facts.stage} · Level ${d.facts.score} met` : "Not established")} ·
      Evidence status ${esc(d.facts.evidence_status)} (${d.facts.evidence_status === "V" ? "verified" : "provisional"}) ·
      Evidence older than 12 months: ${d.facts.stale ? `yes (${esc(d.facts.stale_sources.join(", "))})` : "no"} ·
      ${esc(d.facts.answered)} of ${esc(d.facts.questions)} questions answered</p>
    <p><b>Evidence basis:</b> ${esc(d.facts.basis)}</p>
    <p><b>Why this score</b></p>
    <ul>${d.why.map((w) => `<li>${w.kind === "met" ? "✓" : w.kind === "h" ? "H" : "✗"} ${esc(w.text)}</li>`).join("")}</ul>
    <table>
      <tr><th>Level</th><th>What it tests</th><th>Result</th><th>Weighted</th><th>Yes / other / total</th></tr>
      ${d.levels
        .map(
          (
            l,
          ) => `<tr><td>L${l.level} ${esc(l.name)}</td><td>${esc(l.test)}</td><td>${esc(l.gate || "—")}</td>
        <td>${l.pct != null ? `${l.pct}%` : "—"}</td><td>${l.total ? `${l.yes} / ${l.other} / ${l.total}` : "—"}</td></tr>`,
        )
        .join("")}
    </table>
    ${
      d.sources.filter((s) => s.cited_by.length).length
        ? `
    <p><b>Sources cited</b></p>
    <ul>${d.sources
      .filter((s) => s.cited_by.length)
      .slice(0, 12)
      .map(
        (s) =>
          `<li>${esc(s.code)} · ${s.url ? `<a href="${esc(s.url)}">${esc(s.title || s.url)}</a>` : esc(s.title || "not in the source log")}${s.publisher ? ` · ${esc(s.publisher)}` : ""} (cited by ${s.cited_by.length})</li>`,
      )
      .join("")}</ul>`
        : ""
    }
  `,
    )
    .join("")}`;
}

/** One compared entity: a retailer, competitor or technology partner. */
export interface EntityBlock {
  name: string;
  role: string;
  source: string;
  overall: number | null;
  dimensions: { code: string; name: string; level: number | null }[];
}

const sourceText = (s: string) =>
  s === "workflow"
    ? "Assessed"
    : s === "not_run"
      ? "Not assessed yet"
      : "Provisional";
const lv = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1 ? n.toFixed(2) : "Not established";

function blockSection(b: EntityBlock) {
  return `
  <h2>${esc(b.name)} <span class="muted">(${esc(b.role)} · ${esc(sourceText(b.source))})</span></h2>
  <p>Overall level: <b>${esc(lv(b.overall))}</b></p>
  <table>
    <tr><th>Dimension</th><th>Level</th></tr>
    ${b.dimensions.map((x) => `<tr><td>${esc(x.code)} · ${esc(x.name)}</td><td>${esc(lv(x.level))}</td></tr>`).join("")}
  </table>`;
}

/**
 * The comparison report: a summary table across every entity, then the left entity
 * (full scorecard when it is a retailer with a run) and each entity it is compared with.
 */
export function buildReport(
  period: string,
  kindLabel: string,
  where: { retailerName: string; marketName: string },
  left: EntityBlock,
  leftDetail: { side: Side; details: Detail[] } | null,
  right: EntityBlock[],
  notes: string[] = [],
) {
  const title = `${kindLabel}: ${left.name} vs ${right.map((r) => r.name).join(", ")}`;
  const all = [left, ...right];
  const head = `<tr><th>Dimension</th>${all.map((b) => `<th>${esc(b.name)}</th>`).join("")}</tr>`;
  const rows = left.dimensions
    .map(
      (x) =>
        `<tr><td>${esc(x.code)} · ${esc(x.name)}</td>${all
          .map(
            (b) =>
              `<td>${esc(lv(b.dimensions.find((y) => y.code === x.code)?.level))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const overall = `<tr><th>Overall</th>${all.map((b) => `<th>${esc(lv(b.overall))}</th>`).join("")}</tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: 'Segoe UI', 'Segoe UI Web (West European)', Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #242424; margin: 28px; }
  h1 { font-size: 20pt; font-weight: 600; margin: 0 0 4px; } h2 { font-size: 15pt; font-weight: 600; margin: 28px 0 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; page-break-before: always; }
  h2.first { page-break-before: auto; } h3 { font-size: 12pt; font-weight: 600; margin: 18px 0 2px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 4px; font-size: 10pt; }
  th, td { border: 1px solid #d1d1d1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .muted { color: #616161; font-weight: normal; } ul { margin: 4px 0 8px 18px; padding: 0; } a { color: #0f6cbd; }
</style></head><body>
  <h1>${esc(title)}</h1>
  <p class="muted">${esc(where.retailerName)} · ${esc(where.marketName)} · ${esc(fmtPeriod(period, true))} · Levels are the highest level met in sequence from Level 1; the decimals show progress toward the next level. H = key evidence older than 12 months.</p>
  <h2 class="first">Summary</h2>
  <table>${head}${rows}${overall}</table>
  ${all.some((b) => b.source === "static") ? '<p class="muted">Some levels are provisional until the full assessment data is loaded.</p>' : ""}
  ${notes.length ? `<h3>How to read these results</h3><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
  ${leftDetail ? sideSection(leftDetail.side, leftDetail.details) : blockSection(left)}
  ${right.map(blockSection).join("")}
</body></html>`;
}

/** Download as a Word document. */
export function downloadWord(html: string, filename: string) {
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open the browser's print dialog for the report; choose "Save as PDF". */
export function printPdf(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2000);
  };
  if (doc.readyState === "complete") setTimeout(go, 100);
  else frame.onload = go;
}

/* ---------------------------------------------------------------- Excel */
export interface ExcelInput {
  period: string;
  kindLabel: string;
  where: { retailerName: string; marketName: string };
  left: EntityBlock;
  /** Full scorecard of the left side, when it is a retailer with a run */
  leftDetail: { side: Side; details: Detail[] } | null;
  right: EntityBlock[];
  months: string[];
  /** Level per month for each entity, by dimension code */
  trends: { name: string; trend: Record<string, (number | null)[]> }[];
  /** Client-safe reading notes (from /api/reading-guide) */
  notes?: string[];
}

const BLUE = "FF0F6CBD";
const HEAD_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F5" },
} as const;
const FONT = "Segoe UI";

/** Download the comparison as an Excel workbook (.xlsx): summary, differences, month by month and the scorecard. */
export async function downloadExcel(x: ExcelInput, filename: string) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Retail AI readiness";
  wb.created = new Date();
  const all = [x.left, ...x.right];
  const LV = '"L"0.00';

  const style = (ws: import("exceljs").Worksheet, headRow: number) => {
    ws.eachRow((row, n) => {
      row.eachCell((cell) => {
        cell.font = {
          name: FONT,
          size: 10,
          bold: n === headRow,
          color: n === headRow ? { argb: "FF242424" } : undefined,
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
        cell.alignment = { vertical: "middle", wrapText: true };
        if (n === headRow) cell.fill = HEAD_FILL;
      });
    });
    ws.views = [{ state: "frozen", ySplit: headRow, xSplit: 1 }];
  };
  const title = (
    ws: import("exceljs").Worksheet,
    text: string,
    sub: string,
  ) => {
    ws.getCell("A1").value = text;
    ws.getCell("A1").font = {
      name: FONT,
      size: 14,
      bold: true,
      color: { argb: BLUE },
    };
    ws.getCell("A2").value = sub;
    ws.getCell("A2").font = {
      name: FONT,
      size: 10,
      color: { argb: "FF616161" },
    };
  };
  const sub = `${x.where.retailerName} · ${x.where.marketName} · ${fmtPeriod(x.period, true)}`;

  // 1. Summary: one column per entity
  const s = wb.addWorksheet("Summary");
  title(
    s,
    `${x.kindLabel}: ${x.left.name} vs ${x.right.map((r) => r.name).join(", ")}`,
    sub,
  );
  s.addRow([]);
  s.addRow([
    "Dimension",
    ...all.map((b, i) => (i === 0 ? `${b.name} (compared against)` : b.name)),
  ]);
  for (const d of x.left.dimensions) {
    s.addRow([
      `${d.code} · ${d.name}`,
      ...all.map(
        (b) => b.dimensions.find((y) => y.code === d.code)?.level ?? null,
      ),
    ]);
  }
  const ov = s.addRow(["Overall", ...all.map((b) => b.overall)]);
  s.addRow(["Role", ...all.map((b) => b.role)]);
  s.addRow(["Data", ...all.map((b) => sourceText(b.source))]);
  style(s, 4);
  ov.eachCell((c) => {
    c.font = { name: FONT, size: 10, bold: true };
  });
  s.getColumn(1).width = 40;
  all.forEach((_, i) => {
    const col = s.getColumn(i + 2);
    col.width = 22;
    col.numFmt = LV;
    col.alignment = { horizontal: "right" };
  });

  // 2. Difference from the entity compared against
  if (x.right.length) {
    const df = wb.addWorksheet("Difference");
    title(
      df,
      `Difference from ${x.left.name}`,
      `${sub} · positive = ahead of ${x.left.name}`,
    );
    df.addRow([]);
    df.addRow(["Dimension", ...x.right.map((r) => r.name)]);
    const rows = [
      ...x.left.dimensions.map((d) => ({
        label: `${d.code} · ${d.name}`,
        base: d.level,
        of: (b: EntityBlock) =>
          b.dimensions.find((y) => y.code === d.code)?.level ?? null,
      })),
      {
        label: "Overall",
        base: x.left.overall,
        of: (b: EntityBlock) => b.overall,
      },
    ];
    for (const r of rows) {
      df.addRow([
        r.label,
        ...x.right.map((b) => {
          const v = r.of(b);
          return v != null && r.base != null
            ? Math.round((v - r.base) * 100) / 100
            : null;
        }),
      ]);
    }
    style(df, 4);
    df.getColumn(1).width = 40;
    x.right.forEach((_, i) => {
      const col = df.getColumn(i + 2);
      col.width = 18;
      col.numFmt = "+0.00;-0.00;0.00";
      col.eachCell((c, n) => {
        if (n > 4 && typeof c.value === "number")
          c.font = {
            name: FONT,
            size: 10,
            color: {
              argb:
                c.value > 0
                  ? "FF0E700E"
                  : c.value < 0
                    ? "FFB10E1C"
                    : "FF616161",
            },
          };
      });
    });
  }

  // 3. Month by month: one block per dimension
  const m = wb.addWorksheet("Month by month");
  title(m, "Month by month", `${sub} · level for every month on file`);
  m.addRow([]);
  const names = x.trends.map((t) => t.name);
  m.addRow(["Dimension", "Month", ...names]);
  for (const d of x.left.dimensions) {
    x.months.forEach((mo, i) => {
      m.addRow([
        `${d.code} · ${d.name}`,
        fmtPeriod(mo, true),
        ...x.trends.map((t) => t.trend[d.code]?.[i] ?? null),
      ]);
    });
  }
  style(m, 4);
  m.getColumn(1).width = 40;
  m.getColumn(2).width = 16;
  names.forEach((_, i) => {
    const col = m.getColumn(i + 3);
    col.width = 18;
    col.numFmt = LV;
  });
  m.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: 2 + names.length },
  };

  // 4. Scorecard of the left side, level by level (retailers with a run only)
  if (x.leftDetail) {
    const sc = wb.addWorksheet("Scorecard");
    title(
      sc,
      `${x.leftDetail.side.retailerName} scorecard`,
      `${sub} · a level is met at the threshold, in sequence from Level 1`,
    );
    sc.addRow([]);
    sc.addRow([
      "Dimension",
      "Score",
      "Level",
      "Name",
      "What it tests",
      "Result",
      "Weighted %",
      "Yes",
      "Counted",
      "Questions",
      "Evidence > 12 months",
    ]);
    for (const d of x.leftDetail.details) {
      for (const l of d.levels) {
        sc.addRow([
          `${d.dimension.code} · ${d.dimension.name}`,
          d.score.label.replace(/^L(?=\d)/, ""),
          `L${l.level}`,
          l.name,
          l.test,
          l.gate || "—",
          l.pct != null ? l.pct / 100 : null,
          l.yes,
          l.counted ?? null,
          l.total,
          d.facts.stale ? "Yes (H)" : "No",
        ]);
      }
    }
    style(sc, 4);
    [40, 12, 8, 14, 60, 14, 12, 8, 10, 11, 18].forEach((w, i) => {
      sc.getColumn(i + 1).width = w;
    });
    sc.getColumn(7).numFmt = "0.0%";
    sc.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 11 } };
  }

  // 5. Notes
  const n = wb.addWorksheet("How to read");
  title(n, "How to read these results", sub);
  [
    ...(x.notes?.length
      ? x.notes
      : [
          "Levels are the highest level met in sequence from Level 1; the decimals show progress toward the next level.",
          "H = key evidence older than 12 months.",
        ]),
    ...(all.some((b) => b.source === "static")
      ? [
          "Some levels are provisional until the full assessment data is loaded.",
        ]
      : []),
  ].forEach((t, i) => {
    const c = n.getCell(`A${i + 4}`);
    c.value = t;
    c.font = { name: FONT, size: 10 };
  });
  n.getColumn(1).width = 110;

  await saveWorkbook(wb, filename);
}

/** Save a workbook as `<filename>.xlsx` in the browser. */
async function saveWorkbook(wb: import("exceljs").Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const LENS_LABEL: Record<string, string> = {
  Maturity: "Maturity",
  "Competitive · vendor": "OEM",
  "Competitive · retailer": "Retailer axis",
};

/** Download the Account assessment questions as an Excel workbook (.xlsx), one row per question. */
export async function downloadQuestionsExcel(
  rows: QRow[],
  info: Info,
  dimName: (code: string) => string,
  filename: string,
  /** Each question's source pages and evidence notes, as shown in its details pane */
  sourcesOf?: (qid: string) => QuestionSources,
) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Retail AI readiness";
  wb.created = new Date();
  const ws = wb.addWorksheet("Questions");
  // One line per source (S1, S2, …) and evidence note (EV1, …); "N/A" when there are none
  const sourceText = (r: QRow) => {
    if (!sourcesOf) return r.sources.length ? r.sources.join(", ") : "N/A";
    const { sources, evidence } = sourcesOf(r.qid);
    const lines = [
      ...sources.map((s, i) => `S${i + 1} ${s.url}${s.note ? ` (${s.note})` : ""}`),
      ...evidence.map((e, i) => `EV${i + 1} ${e}`),
    ];
    return lines.length ? lines.join("\n") : "N/A";
  };

  ws.getCell("A1").value = `${info.retailer.name}: questions`;
  ws.getCell("A1").font = { name: FONT, size: 14, bold: true, color: { argb: BLUE } };
  ws.getCell("A2").value =
    `${info.market.name} · ${fmtPeriod(info.period, true)} · ${rows.length} questions`;
  ws.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF616161" } };

  const cols: [string, number][] = [
    ["Q-ID", 12], ["Dimension", 26], ["Sub-theme", 26], ["Question", 60], ["Score", 8],
    ["Rating", 20], ["Lens", 14], ["Level", 7], ["Sources", 60],
  ];
  const head = 4;
  ws.getRow(head).values = cols.map((c) => c[0]);
  cols.forEach(([, w], i) => (ws.getColumn(i + 1).width = w));
  rows.forEach((r) =>
    ws.addRow([
      r.qid,
      `${r.dimension} · ${dimName(r.dimension)}`,
      r.sub_theme,
      r.text,
      // Not applicable questions show N/A, as on the page
      r.score ?? (r.status === "N/A" ? "N/A" : null),
      ratingOf(r.status).label,
      LENS_LABEL[r.lens] ?? r.lens,
      r.level ?? null,
      sourceText(r),
    ]),
  );
  ws.getColumn(5).numFmt = "0.00";

  ws.eachRow((row, n) => {
    if (n < head) return;
    row.eachCell((cell) => {
      cell.font = { name: FONT, size: 10, bold: n === head };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
      cell.alignment = { vertical: "top", wrapText: true };
      if (n === head) cell.fill = HEAD_FILL;
    });
  });
  ws.views = [{ state: "frozen", ySplit: head, xSplit: 1 }];
  ws.autoFilter = { from: { row: head, column: 1 }, to: { row: head, column: cols.length } };

  await saveWorkbook(wb, filename);
}
