import { useEffect, useMemo, useRef, useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: (number | null)[];
}

/** Multi-series line chart: one y-axis, 2px lines, crosshair + tooltip on hover, legend and end labels. */
export function LineChart({
  series,
  labels,
  yMax,
  yMin = 0,
  format = (v) => v.toFixed(1),
  height = 240,
  unit = "",
  ticks: tickCount = 5,
  tickFormat = format,
  dots = false,
}: {
  series: Series[];
  labels: string[];
  yMax: number;
  yMin?: number;
  format?: (v: number) => string;
  height?: number;
  unit?: string;
  /** Number of y-axis gridlines including both ends (default 5) */
  ticks?: number;
  /** Format for the y-axis labels (default: `format`) */
  tickFormat?: (v: number) => string;
  /** Always show a point where a value exists; months without a value show no tooltip */
  dots?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real width so text stays at its true size
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Measure now too, so the first draw is at the real width even before the observer reports
    setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(280, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height,
    padL = 40,
    padR = W < 480 ? 56 : 92,
    padT = 12,
    padB = 26;
  const x = (i: number) =>
    padL + (i * (W - padL - padR)) / Math.max(1, labels.length - 1);
  const y = (v: number) =>
    padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const ticks = useMemo(() => {
    const step = (yMax - yMin) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => yMin + step * i);
  }, [yMax, yMin, tickCount]);

  // End labels, nudged apart so they don't collide
  const ends = series
    .map((s) => {
      const last = [...s.values].reverse().find((v) => v != null);
      return {
        name: s.name,
        color: s.color,
        v: last ?? null,
        y: last == null ? 0 : y(last),
      };
    })
    .filter((e) => e.v != null)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(
      0,
      Math.min(
        labels.length - 1,
        Math.round(((px - padL) / (W - padL - padR)) * (labels.length - 1)),
      ),
    );
    // With dots, months without a value show no tooltip
    setHover(!dots || series.some((s) => s.values[i] != null) ? i : null);
  };

  return (
    <div className="lc">
      <ul className="legend lc__legend">
        {series.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="lc__wrap" ref={wrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="lc__svg"
          role="img"
          // aria-label rather than <title>, so screen readers get the values without the browser's own hover tooltip
          aria-label={series
            .map(
              (s) =>
                `${s.name}: ${s.values.map((v, i) => `${labels[i]} ${v == null ? "—" : format(v)}`).join(", ")}`,
            )
            .join(". ")}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          // With dots, months without a value show a disabled cursor
          style={
            dots ? { cursor: hover != null ? "pointer" : "not-allowed" } : undefined
          }
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                className="lc__grid"
              />
              <text
                x={padL - 8}
                y={y(t) + 4}
                className="lc__tick"
                textAnchor="end"
              >
                {tickFormat(t)}
                {unit}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            W < 520 &&
            i % 2 === 1 &&
            i !== labels.length - 1 &&
            hover !== i ? null : (
              <text
                key={l + i}
                x={x(i)}
                y={H - 6}
                className={`lc__tick ${hover === i ? "is-on" : ""}`}
                textAnchor="middle"
              >
                {l}
              </text>
            ),
          )}
          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={H - padB}
              className="lc__cross"
            />
          )}
          {series.map((s) => {
            const pts = s.values
              .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
              .filter(Boolean)
              .join(" ");
            return (
              <g key={s.name}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.values.map((v, i) =>
                  v == null ? null : (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(v)}
                      r={hover === i ? (dots ? 6 : 4.5) : dots ? 4.5 : 0}
                      style={dots ? { cursor: "pointer" } : undefined}
                      onMouseEnter={dots ? () => setHover(i) : undefined}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ),
                )}
              </g>
            );
          })}
          {series.length <= 6 &&
            ends.map((e) => (
              <text
                key={e.name}
                x={W - padR + 8}
                y={e.y + 4}
                className="lc__end"
              >
                {e.name} <tspan className="lc__endv">{format(e.v!)}</tspan>
              </text>
            ))}
        </svg>
        {hover != null && (
          <div
            className="lc__tip"
            style={{ left: `${(x(hover) / W) * 100}%` }}
            role="status"
          >
            <b>{labels[hover]}</b>
            {series.map((s) => (
              <span key={s.name}>
                <i style={{ background: s.color }} />
                {s.name}
                <em>
                  {s.values[hover] == null
                    ? "—"
                    : `${format(s.values[hover]!)}${unit}`}
                </em>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
