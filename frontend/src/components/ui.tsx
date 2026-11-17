import {
  Dismiss24Regular,
  ErrorCircle20Regular,
  Info16Regular,
} from "@fluentui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import type { DimCode, Info, Score } from "../lib/api";
import {
  DIM_COLOR,
  DIM_TINT,
  RATINGS,
  RATING_OF,
  ratingOf,
  type RatingId,
  fmtDate,
  fmtPeriod,
} from "../lib/constants";
import { ALL_ITEMS } from "../lib/nav";

/* ---------- Page header ---------- */
// lede, info and actions are still accepted (pages pass them) but not shown at the moment
export function PageHeader({
  title,
}: {
  title?: string;
  lede?: ReactNode;
  info?: Info;
  actions?: ReactNode;
}) {
  const { pathname } = useLocation();
  const item = ALL_ITEMS.find((i) => i.path === pathname);
  return (
    <header className="page-head">
      <div className="page-head__text">
        {/* {item && <p className="page-head__crumb">{item.section}</p>} */}
        <h1 className="page-head__title--small">{title ?? item?.label}</h1>
        {/* <p className="page-head__lede">{lede ?? item?.blurb}</p> */}
      </div>
      {/* <div className="page-head__side">
        {actions}
        {info && <SourceBadge info={info} />}
      </div> */}
    </header>
  );
}

export function SourceBadge({ info }: { info: Info }) {
  const real = info.data_source === "workflow";
  return (
    <div
      className={`source ${real ? "source--real" : "source--demo"}`}
      title={info.notes[0]}
    >
      <span className="source__dot" aria-hidden="true" />
      <span>
        <b>
          {real
            ? `Workflow run · ${fmtDate(info.run_date)}`
            : info.data_source === "not_run"
              ? "Not run yet"
              : "Assessment"}
        </b>
        <small>
          {info.retailer.name} · {info.market.name} ·{" "}
          {fmtPeriod(info.period, true)}
        </small>
      </span>
    </div>
  );
}

export function DemoNotice(_: { info?: Info }) {
  // The "Not run yet" banner is hidden: October shows no notice. The header badge still says so.
  return null;
}

/* ---------- Containers ---------- */
export function Panel({
  title,
  sub,
  actions,
  children,
  className = "",
  pad = true,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`panel ${pad ? "" : "panel--flush"} ${className}`}>
      {(title || actions) && (
        <div className="panel__head">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {sub && <p className="panel__sub">{sub}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Atoms ---------- */
/** A question's result, shown as its rating (Good, Okay, Needs Optimization, …). */
export function StatusChip({
  status,
  size = "md",
  showStatus = false,
}: {
  status: string;
  size?: "sm" | "md";
  /** Also show the stored status when it says more than the rating, e.g. "Needs Optimization · Not disclosed" */
  showStatus?: boolean;
}) {
  const r = ratingOf(status);
  const extra =
    showStatus &&
    (status === "Issue" || status === "No" || status === "Not disclosed");
  return (
    <span
      className={`chip chip--${size} chip--${r.id} ${r.hatched ? "chip--hatched" : ""} ${r.outline ? "chip--outline" : ""}`}
      style={{ background: r.tint, color: r.ink }}
      title={`${r.label}: ${r.meaning}${status !== r.label ? ` (C5i status: ${status})` : ""}`}
    >
      <i style={{ background: r.color }} aria-hidden="true" />
      {r.label}
      {extra && <small className="chip__status">· {status}</small>}
    </span>
  );
}

/** A rating on its own (for things rated as a whole, such as a site check). */
export function RatingChip({
  rating,
  size = "md",
}: {
  rating: RatingId;
  size?: "sm" | "md";
}) {
  const r = RATINGS.find((x) => x.id === rating) ?? RATINGS[RATINGS.length - 1];
  return (
    <span
      className={`chip chip--${size} chip--${r.id} ${r.hatched ? "chip--hatched" : ""} ${r.outline ? "chip--outline" : ""}`}
      style={{ background: r.tint, color: r.ink }}
      title={`${r.label}: ${r.meaning}`}
    >
      <i style={{ background: r.color }} aria-hidden="true" />
      {r.label}
    </span>
  );
}

export function DimTag({ code, label }: { code: DimCode; label?: string }) {
  return (
    <span
      className="dimtag"
      style={{ color: DIM_COLOR[code], background: DIM_TINT[code] }}
    >
      <b>{code}</b>
      {label && <span>{label}</span>}
    </span>
  );
}

export function Lvl({ n }: { n: number | null }) {
  return (
    <span className="lvl" aria-label={n ? `Tests level ${n}` : "No level"}>
      {n ?? "—"}
    </span>
  );
}

export function Sources({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="muted">—</span>;
  return (
    <span className="srcs">
      {ids.map((s) => (
        <code key={s}>{s}</code>
      ))}
    </span>
  );
}

/** Horizontal stacked bar of results by rating, with a 2px surface gap between segments. */
export function StackBar({
  counts,
  total,
  height = 10,
  showLegend = false,
  showAll = false,
}: {
  /** Counts by stored status (Yes, Partial, …); they are grouped into ratings */
  counts: Record<string, number>;
  total?: number;
  height?: number;
  showLegend?: boolean;
  /** Also show Good, Okay, Needs Optimization and Not yet checked when their count is zero */
  showAll?: boolean;
}) {
  const byRating: Record<string, number> = {};
  for (const [s, n] of Object.entries(counts)) {
    const id = RATING_OF[s] ?? "na";
    byRating[id] = (byRating[id] ?? 0) + n;
  }
  const alwaysShown = ["good", "okay", "needs", "pending"];
  const shown = RATINGS.filter((r) => byRating[r.id] || (showAll && alwaysShown.includes(r.id)));
  const t = total ?? Object.values(byRating).reduce((a, b) => a + b, 0);
  const [hover, setHover] = useState<RatingId | null>(null);
  return (
    <div className="stack">
      <div
        className="stack__bar"
        style={{ height }}
        role="img"
        aria-label={shown.map((r) => `${r.label} ${byRating[r.id]}`).join(", ")}
      >
        {shown.map((r) => (
          <span
            key={r.id}
            className={`stack__seg ${r.hatched ? "is-hatched" : ""} ${r.outline ? "is-outline" : ""} ${hover && hover !== r.id ? "is-dim" : ""}`}
            style={{ flexGrow: byRating[r.id] ?? 0, background: r.color }}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="stack__tip" role="tooltip">
              {r.label} · {byRating[r.id] ?? 0} of {t}
            </span>
          </span>
        ))}
      </div>
      {showLegend && (
        <ul className="legend">
          {shown.map((r) => (
            <li
              key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              title={r.meaning}
            >
              <i
                className={`${r.hatched ? "is-hatched" : ""} ${r.outline ? "is-outline" : ""}`}
                style={{ background: r.color }}
              />
              {r.label} <b>{byRating[r.id] ?? 0}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The level staircase: five rising steps (Crawl · Walk · Run). Met steps fill with
 * the dimension's hue; the next step fills to the fraction of its threshold.
 */
export function LevelLadder({
  score,
  compact = false,
}: {
  score: Score;
  compact?: boolean;
}) {
  const color = DIM_COLOR[score.dimension];
  return (
    <div
      className={`ladder ${compact ? "ladder--compact" : ""}`}
      role="img"
      aria-label={`${score.dimension} ${score.label}: ${score.level ? `level ${score.level} met` : "not established"}`}
    >
      {score.cells.map((c, i) => {
        // Met levels are full; the next level fills by the progress shown in the decimals (L3.71 → L4 is 71% full)
        const met = c.level <= score.level;
        const next = c.level === score.level + 1;
        const fill = met
          ? 1
          : next
            ? Math.max(0, Math.min(1, score.fraction ?? 0))
            : 0;
        // Met through the levels above it (no questions of its own): say so instead of a percentage.
        // The next level has no weighted share of its own here, so show the progress toward it.
        const pct =
          c.pct != null
            ? `${Math.round(c.pct)}%`
            : met && c.result === "Inferred"
              ? "Met"
              : next && fill > 0
                ? `${Math.round(fill * 100)}%`
                : "";
        return (
          <div
            key={c.level}
            className="ladder__col"
            title={
              c.pct != null
                ? `Level ${c.level}: ${c.pct}% weighted${met ? " · met" : next ? ` · ${Math.round(fill * 100)}% of the way to meeting it` : ""}`
                : `Level ${c.level}: no answered questions`
            }
          >
            {!compact && (
              <span
                className={`ladder__pct ${next ? "is-next" : ""}`}
                style={next ? { color } : undefined}
              >
                {pct}
              </span>
            )}
            <div
              className={`ladder__step ${c.result === "Ceiling" ? "is-ceiling" : ""} ${next && fill > 0 ? "is-partial" : ""} ${next ? "is-next" : ""}`}
              style={{
                height: `${(compact ? 28 : 22) + i * (compact ? 18 : 15)}%`,
              }}
            >
              <motion.span
                className="ladder__fill"
                style={{ background: color }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: fill }}
                transition={{
                  delay: 0.15 + i * 0.09,
                  duration: 0.6,
                  ease: [0, 0, 0, 1],
                }}
              />
              {!compact && <span className="ladder__n">L{c.level}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The levels as dots: a filled dot for each met level, an empty one for the rest. No percentages. */
export function LevelDots({ score }: { score: Score }) {
  return (
    <div
      className="dots"
      role="img"
      aria-label={`${score.dimension} ${score.label}: ${score.level ? `level ${score.level} met` : "not established"}`}
    >
      {score.cells.map((c) => {
        const met = c.level <= score.level;
        // The next level fills to the progress shown in the decimals (L3.71 → L4 is 71% full)
        const next = c.level === score.level + 1;
        const fill = met ? 1 : next ? Math.max(0, Math.min(1, score.fraction ?? 0)) : 0;
        const partial = next && fill > 0;
        return (
          <div
            key={c.level}
            className="dots__col"
            title={`Level ${c.level}: ${met ? "met" : partial ? `${Math.round(fill * 100)}% of the way to meeting it` : "not met"}`}
          >
            <span
              className={`dots__dot ${met ? "is-met" : ""} ${partial ? "is-partial" : ""}`}
              style={partial ? { ["--fill" as string]: `${Math.round(fill * 100)}%` } : undefined}
            />
            <span className="dots__label">L{c.level}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  color = "var(--brand)",
  marker,
}: {
  value: number | null;
  max?: number;
  color?: string;
  marker?: number;
}) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
  return (
    <span className="meter">
      <span className="meter__track">
        <motion.span
          className="meter__fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0, 0, 0, 1] }}
        />
        {marker != null && (
          <span
            className="meter__mark"
            style={{ left: `${(marker / max) * 100}%` }}
          />
        )}
      </span>
    </span>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: NoInfer<T>) => void;
  tabs: { value: NoInfer<T>; label: ReactNode }[];
}) {
  const id = useId();
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className="tabs__tab"
          onClick={() => onChange(t.value)}
        >
          {value === t.value && (
            <motion.span
              layoutId={`tab-${id}`}
              className="tabs__ink"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: NoInfer<T>) => void;
  options: { value: NoInfer<T>; label: string }[];
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- States ---------- */
export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="loading" aria-busy="true" aria-label="Loading">
      <div className="sk sk--title" />
      <div className="sk-grid">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="sk sk--card" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="state state--error" role="alert">
      <ErrorCircle20Regular />
      <div>
        <b>The data could not be loaded.</b>
        <p>
          {error instanceof Error ? error.message : String(error)}. Check that
          the API is running on port 8000, then try again.
        </p>
        {retry && (
          <button type="button" className="btn btn--subtle" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="state">
      <Info16Regular />
      <div>
        <b>{title}</b>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

/* ---------- Drawer ---------- */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 320 }}
          >
            <div className="drawer__head">
              <div className="drawer__title">{title}</div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={onClose}
                autoFocus
              >
                <Dismiss24Regular />
              </button>
            </div>
            <div className="drawer__body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------- Modal (centred dialog) ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
  actions?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`modal ${wide ? "modal--wide" : ""}`}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0, 0, 0, 1] }}
          >
            <div className="modal__head">
              <div className="modal__title">{title}</div>
              <div className="modal__actions">
                {actions}
                <button
                  type="button"
                  className="icon-btn modal__close"
                  aria-label="Close"
                  onClick={onClose}
                  autoFocus
                >
                  <Dismiss24Regular />
                </button>
              </div>
            </div>
            <div className="modal__body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
