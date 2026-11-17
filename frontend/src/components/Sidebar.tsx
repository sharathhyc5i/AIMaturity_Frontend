import {
  ChevronDown16Regular,
  Navigation24Regular,
} from "@fluentui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV } from "../lib/nav";
import { useFilters } from "../lib/filters";
import { fmtDate } from "../lib/constants";
import { useScoped, type Info } from "../lib/api";
import { useAuth } from "../lib/auth";

/** The sidebar section that contains a page. */
const ownerOf = (path: string) =>
  NAV.find((s) => s.items.some((i) => i.path === path))?.id;

function useDesktop() {
  const q = "(min-width: 1100px)";
  const [on, setOn] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setOn(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return on;
}

export function Sidebar({
  open,
  onNavigate,
  rail: railPref,
  onToggleRail,
}: {
  open: boolean;
  onNavigate: () => void;
  rail: boolean;
  onToggleRail: () => void;
}) {
  const { search, pathname } = useLocation();
  const { data } = useScoped<{ info: Info }>("/api/reading-guide");
  const info = data?.info;
  const { isAdmin } = useAuth();
  useFilters();
  const desktop = useDesktop();
  const rail = railPref && desktop;

  // On load only the section of the current page is open; the others start folded
  const [openIds, setOpenIds] = useState<string[]>(() => {
    const o = ownerOf(pathname);
    return o ? [o] : [];
  });
  const toggle = (id: string) =>
    setOpenIds((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );

  // Going to a page inside a folded section opens that section
  useEffect(() => {
    const o = ownerOf(pathname);
    if (o) setOpenIds((c) => (c.includes(o) ? c : [...c, o]));
  }, [pathname]);

  const sections = NAV.filter((s) => !s.adminOnly || isAdmin);

  return (
    <nav
      className={`sidebar ${open ? "is-open" : ""} ${rail ? "is-rail" : ""}`}
      aria-label="Main"
    >
      <div className="sidebar__top">
        <button
          type="button"
          className="icon-btn sidebar__collapse"
          onClick={onToggleRail}
          aria-label={rail ? "Expand navigation" : "Collapse navigation"}
          title={rail ? "Expand navigation" : "Collapse navigation"}
        >
          <Navigation24Regular
            primaryFill="#1b1b1b"
            style={{ width: 24, height: 24 }}
          />
        </button>
      </div>
      <div className="sidebar__scroll">
        {sections.map((section) => {
          // A "single" section (Guide) is one link; its pages are tabs on the page itself
          if (section.single) {
            const on = section.items.some((i) => i.path === pathname);
            return (
              <div className="nav-section nav-section--single" key={section.id}>
                <NavLink
                  to={{ pathname: section.items[0].path, search }}
                  className={`nav-section__title nav-single ${on ? "is-on" : ""}`}
                  onClick={onNavigate}
                  title={rail ? section.label : undefined}
                  aria-current={on ? "page" : undefined}
                >
                  <section.icon className="nav-section__icon" />
                  <span className="nav-section__label">{section.label}</span>
                </NavLink>
              </div>
            );
          }
          const isOpen = rail || openIds.includes(section.id);
          const listId = `nav-${section.id}`;
          return (
            <div
              className={`nav-section ${isOpen ? "" : "is-closed"}`}
              key={section.id}
            >
              <button
                type="button"
                className="nav-section__title"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                aria-controls={listId}
                tabIndex={rail ? -1 : 0}
              >
                <section.icon className="nav-section__icon" />
                <span className="nav-section__label">{section.label}</span>
                <ChevronDown16Regular className="nav-section__chev" />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    id={listId}
                    key="list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1, gap: "6px" }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                  >
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={{ pathname: item.path, search }}
                          className={`nav-link ${item.locked ? "nav-link--locked" : ""}`}
                          aria-disabled={item.locked || undefined}
                          onClick={(e) => {
                            if (item.locked) {
                              e.preventDefault();
                              return;
                            }
                            onNavigate();
                          }}
                          title={rail ? item.label : undefined}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId="nav-active"
                                  className="nav-link__bg"
                                  transition={{
                                    type: "spring",
                                    stiffness: 520,
                                    damping: 40,
                                  }}
                                />
                              )}
                              {isActive && (
                                <motion.span
                                  layoutId="nav-bar"
                                  className="nav-link__bar"
                                  transition={{
                                    type: "spring",
                                    stiffness: 520,
                                    damping: 40,
                                  }}
                                />
                              )}
                              <item.icon className="nav-link__icon" />
                              <span className="nav-link__label">
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {info && (
        <div
          className={`sidebar__run ${info.data_source === "illustrative" ? "is-demo" : ""}`}
          title={
            rail
              ? `${info.retailer.name} · ${info.market.name} · ${fmtDate(info.run_date)}`
              : undefined
          }
        >
          <span className="sidebar__run-dot" aria-hidden="true" />
          <div className="sidebar__run-text">
            <b>
              {info.data_source === "workflow"
                ? "Workflow run"
                : info.data_source === "not_run"
                  ? "Not run yet"
                  : "Assessment"}
            </b>
            <small>
              {info.retailer.name} · {info.market.name} ·{" "}
              {fmtDate(info.run_date)}
            </small>
          </div>
        </div>
      )}
    </nav>
  );
}
