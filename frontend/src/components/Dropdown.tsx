import {
  ChevronDown20Regular,
  Checkmark20Regular,
} from "@fluentui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface Option {
  value: string;
  label: string;
  hint?: string;
  badge?: ReactNode;
  disabled?: boolean;
}

/** Accessible listbox dropdown (arrow keys, Home/End, Enter, Escape, type-ahead). */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  icon,
  wide,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  icon?: ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    const onDoc = (e: MouseEvent) => {
      if (!btn.current?.parentElement?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    requestAnimationFrame(() => list.current?.focus());
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, options, value]);

  // Move the highlight to the next option that can be chosen
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir)
      if (!options[i].disabled) return i;
    return from;
  };

  const choose = (i: number) => {
    if (options[i]?.disabled) return;
    onChange(options[i].value);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => step(a, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => step(a, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(step(-1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(step(options.length, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      btn.current?.focus();
    } else if (e.key.length === 1) {
      const i = options.findIndex(
        (o) =>
          !o.disabled && o.label.toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div className={`dd ${wide ? "dd--wide" : ""}`}>
      <span className="dd__label" id={`${id}-l`}>
        {label}
      </span>
      <button
        ref={btn}
        type="button"
        className="dd__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l ${id}-v`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {icon && <span className="dd__icon">{icon}</span>}
        <span className="dd__value" id={`${id}-v`}>
          {current?.label ?? "Choose…"}
        </span>
        <ChevronDown20Regular className={`dd__chev ${open ? "is-open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            className="dd__list"
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-l`}
            aria-activedescendant={`${id}-o${active}`}
            onKeyDown={onKey}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0, 0, 0, 1] }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                className={`dd__opt ${i === active && !o.disabled ? "is-active" : ""} ${o.disabled ? "is-disabled" : ""}`}
                onMouseEnter={() => {
                  if (!o.disabled) setActive(i);
                }}
                onClick={() => choose(i)}
              >
                <span className="dd__opt-main">
                  <span>{o.label}</span>
                  {/* {o.hint && 
                  <small>{o.hint}</small>
                  } */}
                </span>
                {o.badge}
                {o.value === value && (
                  <Checkmark20Regular className="dd__tick" />
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
