import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SIDEBAR_KEY } from "../lib/intro";

export function Layout() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  // Collapsed by default. Expanding is remembered for reloads in this session only;
  // signing out or opening the app fresh starts collapsed again.
  const [rail, setRail] = useState(() => {
    try {
      return sessionStorage.getItem(SIDEBAR_KEY) !== "0";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(SIDEBAR_KEY, rail ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [rail]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [menu]);

  return (
    <div className={`shell ${rail ? "shell--rail" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header onMenu={() => setMenu((m) => !m)} menuOpen={menu} />
      <Sidebar
        open={menu}
        onNavigate={() => setMenu(false)}
        rail={rail}
        onToggleRail={() => setRail((r) => !r)}
      />
      <AnimatePresence>
        {menu && (
          <motion.div
            className="scrim scrim--nav"
            onClick={() => setMenu(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <main id="main" className="main" tabIndex={-1}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0, 0, 0, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
