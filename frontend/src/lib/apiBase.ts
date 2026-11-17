/**
 * Where the API lives. Empty (the default) = the same site as the pages, which is how the app
 * is normally deployed: one App Service serves both. Set VITE_API_URL (frontend/.env.production)
 * when the pages are hosted somewhere else, e.g. https://ai-maturity-backend.azurewebsites.net
 */
export const API_BASE = String(import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/** Full address of an API path ("/api/…" or "/.auth/…"); absolute URLs pass through unchanged. */
export const apiUrl = (path: string) =>
  /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
