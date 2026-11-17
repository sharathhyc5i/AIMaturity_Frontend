import {
  Box20Regular,
  BuildingRetail20Regular,
  Dismiss24Regular,
  Globe20Regular,
  Navigation24Regular,
} from "@fluentui/react-icons";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ROUTE_NAME } from "../lib/constants";
import { useFilters } from "../lib/filters";
import {
  DISABLED_NOTE,
  REGION_BY_COUNTRY,
  REGIONS,
  countryDisabled,
  retailerDisabled,
  skuDisabled,
} from "../lib/headerOptions";
// import { BrandLogo } from "./BrandLogo";
import { Dropdown } from "./Dropdown";
import { MonthPicker } from "./MonthPicker";
import { UserMenu } from "./UserMenu";

function Filters() {
  const { meta, retailer, market,sku, period, setRetailer, setMarket, setPeriod , setSku} =
    useFilters();
  if (!meta)
    return (
      <div className="filters filters--loading" aria-busy="true">
        <span />
        <span />
        <span />
      </div>
    );
  const r = meta.retailers.find((x) => x.slug === retailer)!;
  const mk = r.markets.find((x) => x.code === market)!;
  // Markets of this retailer that fall in a region and can be chosen
  const openMarkets = (region: string) =>
    r.markets.filter(
      (m) =>
        REGION_BY_COUNTRY[m.code] === region && !countryDisabled(r.slug, m.code),
    );
  return (
    <div className="filters">
      <Dropdown
        label="Region"
        value={REGION_BY_COUNTRY[market] ?? REGIONS[0]}
        icon={<Globe20Regular />}
        onChange={(name) => {
          const first = openMarkets(name)[0];
          if (first) setMarket(first.code);
        }}
        options={REGIONS.map((name) => {
          const off = openMarkets(name).length === 0;
          return {
            value: name,
            label: name,
            disabled: off,
            hint: off ? DISABLED_NOTE : undefined,
          };
        })}
      />
      <Dropdown
        label="Retailer"
        value={retailer}
        icon={<BuildingRetail20Regular />}
        onChange={setRetailer}
        wide
        options={[...meta.retailers]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((x) => {
          const off = retailerDisabled(x.slug);
          return {
            value: x.slug,
            label: x.name,
            disabled: off,
            hint: off
              ? DISABLED_NOTE
              : `${ROUTE_NAME[x.route]} · ${x.markets.map((m) => m.name).join(", ")}`,
          };
        })}
      />
      <Dropdown
        label="LOB"
        value={sku}
        icon={<Box20Regular />}
        onChange={setSku}
        options={meta.skus.map((s) => {
          const off = skuDisabled(s.code);
          return {
            value: s.code,
            label: s.name,
            disabled: off,
            hint: off ? DISABLED_NOTE : undefined,
          };
        })}
      />
      <MonthPicker
        value={period}
        available={mk.periods}
        workflow={mk.workflow_periods}
        onChange={setPeriod}
      />
    </div>
  );
}

export function Header({
  onMenu,
  menuOpen,
}: {
  onMenu: () => void;
  menuOpen: boolean;
}) {
  // const { meta, retailer } = useFilters();
  const [sheet, setSheet] = useState(false);
  // const r = meta?.retailers.find((x) => x.slug === retailer);
  // const mk = r?.markets.find((x) => x.code === market);

  return (
    <header className="header">
      <div className="header__start">
        <button
          type="button"
          className="icon-btn header__menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          {menuOpen ? <Dismiss24Regular /> : <Navigation24Regular />}
        </button>
        <img
          src="/microsoft.png"
          alt="Microsoft"
          className="header__ms"
          width={45}
          height={45}
        />
        {/* <span className="header__divider" aria-hidden="true" /> */}
        <span className="splash__title_head">Retailer AI Maturity</span>
      </div>

      <div className="header__center">
        <Filters />
      </div>
      {/* 
      <button
        type="button"
        className="header__filter-btn"
        onClick={() => setSheet(true)}
        aria-label="Change retailer, country or month"
      >
        <Filter20Regular />
        <span>
          <b>{r?.name ?? "…"}</b>
          <small>
            {mk?.name}
            {period ? ` · ${fmtPeriod(period)}` : ""}
          </small>
        </span>
      </button> */}

      <div className="header__end">
        {/* {r && (
          <AnimatePresence mode="wait">
            <motion.span key={r.slug} className="header__retailer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <BrandLogo id={r.slug} name={r.name} height={22} />
            </motion.span>
          </AnimatePresence>
        )} */}
        {/* <BrandLogo id="microsoft" height={22} className="header__ms" /> */}
        <img
          src="/c5ilogo.png"
          alt="C5I"
          className="header__ms"
          width={32}
          height={40}
        />
      </div>
      <UserMenu />

      {createPortal(
        <AnimatePresence>
          {sheet && (
            <>
              <motion.div
                className="scrim"
                onClick={() => setSheet(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Filters"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 340 }}
              >
                <div className="sheet__grip" aria-hidden="true" />
                <div className="sheet__head">
                  <h2>Show results for</h2>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Close"
                    onClick={() => setSheet(false)}
                  >
                    <Dismiss24Regular />
                  </button>
                </div>
                <Filters />
                <button
                  type="button"
                  className="btn btn--primary sheet__done"
                  onClick={() => setSheet(false)}
                >
                  Done
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  );
}
