import { DEFAULT_RETAILER, countryDisabled, retailerDisabled, skuDisabled } from "./headerOptions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useMeta, type Meta } from "./api";
import { registerDimensions } from "./constants";

interface FilterState {
  retailer: string;
  market: string;
  period: string;
  sku: string;
  ready: boolean;
  meta?: Meta;
  setRetailer: (slug: string) => void;
  setMarket: (code: string) => void;
  setPeriod: (p: string) => void;
  setSku: (s: string) => void;
}

const Ctx = createContext<FilterState | null>(null);

/** Header filters live in the URL (?retailer=&market=&period=&lob=) so any view can be shared as a link. */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const { data: meta } = useMeta();
  if (meta) registerDimensions(meta.dimensions);
  const [params, setParams] = useSearchParams();

  const resolved = useMemo(() => {
    if (!meta) return null;
    // A disabled retailer or country (lib/headerOptions.ts) is never shown, even from an old link
    const okR = meta.retailers.filter((x) => !retailerDisabled(x.slug));
    const pickR = okR.length ? okR : meta.retailers;
    const r =
      pickR.find((x) => x.slug === params.get("retailer")) ??
      pickR.find((x) => x.slug === DEFAULT_RETAILER) ??
      pickR.find((x) => x.slug === meta.defaults.retailer) ??
      pickR[0];
    const okM = r.markets.filter((x) => !countryDisabled(r.slug, x.code));
    const pickM = okM.length ? okM : r.markets;
    const mk =
      pickM.find((x) => x.code === params.get("market")) ??
      pickM.find((x) => x.code === meta.defaults.market) ??
      pickM[0];
    const want = params.get("period") ?? meta.defaults.period;
    const period = mk.periods.includes(want)
      ? want
      : mk.periods[mk.periods.length - 1];
    // SKUs come from Admin > Settings; an unknown, removed or disabled SKU (lib/headerOptions.ts) falls back to the first open one
    const okS = meta.skus.filter((s) => !skuDisabled(s.code));
    const pickS = okS.length ? okS : meta.skus;
    const sku =
      pickS.find((s) => s.code === params.get("lob"))?.code ??
      pickS[0]?.code ??
      "";
    return { retailer: r.slug, market: mk.code, period, sku };
  }, [meta, params]);

  // Keep the URL in step with what is actually shown
  useEffect(() => {
    if (!resolved) return;
    if (
      params.get("retailer") !== resolved.retailer ||
      params.get("market") !== resolved.market ||
      params.get("period") !== resolved.period ||
      (resolved.sku && params.get("lob") !== resolved.sku)
    ) {
      const next = new URLSearchParams(params);
      next.set("retailer", resolved.retailer);
      next.set("market", resolved.market);
      next.set("period", resolved.period);
      if (resolved.sku) next.set("lob", resolved.sku);
      setParams(next, { replace: true });
    }
  }, [resolved, params, setParams]);

  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => next.set(k, v));
      setParams(next);
    },
    [params, setParams],
  );

  const value: FilterState = {
    retailer: resolved?.retailer ?? "",
    market: resolved?.market ?? "",
    period: resolved?.period ?? "",
    sku: resolved?.sku ?? "",
    ready: !!resolved,
    meta,
    setRetailer: (slug) => {
      const r = meta?.retailers.find((x) => x.slug === slug);
      const mk =
        r?.markets.find((x) => !countryDisabled(slug, x.code)) ?? r?.markets[0];
      update({ retailer: slug, market: mk?.code ?? "" });
    },
    setMarket: (code) => update({ market: code }),
    setPeriod: (p) => update({ period: p }),
    setSku: (s) => update({ sku: s }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFilters must be used inside FiltersProvider");
  return v;
}
