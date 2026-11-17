import { NavLink, Outlet, useLocation } from "react-router-dom";
import { GUIDE_ITEMS } from "../lib/nav";

/** Short tab names; the full name still shows as the page title. */
const SHORT: Record<string, string> = {
  "/guide/question-set": "Question set",
  "/guide/accounts": "Account list",
  "/guide/dm8-target": "DM8 target",
  "/guide/dimensions": "Dimensions",
  "/guide/levels": "Five levels",
  "/guide/scoring-framework": "Scoring framework",
  "/guide/evidence-quality": "Evidence quality",
  "/guide/freshness": "Freshness policy",
};

/** Guide pages share one tab bar (same style as Settings). Each tab keeps its own URL. */
export function GuideTabs() {
  const { search } = useLocation();
  return (
    <>
      <nav className="sect-nav guide-tabs" aria-label="Guide sections">
        {GUIDE_ITEMS.map((i) => (
          <NavLink
            key={i.path}
            to={{ pathname: i.path, search }}
            title={i.label}
          >
            {SHORT[i.path] ?? i.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
