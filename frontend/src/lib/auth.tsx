import { resetIntro } from "./intro";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { API_BASE, apiUrl } from "./apiBase";

/**
 * Who is signed in. There is no sign-in page; the API says which mode it runs in
 * (GET /api/auth/config) and the role (admin or user) always comes from /api/auth/me:
 *  - "local":     no sign-in. The API treats every request as LOCAL_USER_EMAIL.
 *  - "microsoft": Microsoft SSO through Azure App Service Authentication. The user's
 *                 email and name come from /.auth/me; if nobody is signed in the app
 *                 goes straight to Microsoft. The session is a cookie, so API calls
 *                 need no extra header.
 *  - "dev":       "Authorization: Dev <email>" from session storage (tests only).
 */
export interface AuthConfig {
  mode: "local" | "microsoft" | "dev";
  me_url: string;
  login_url: string;
  logout_url: string;
  ready: boolean;
  allowed_domains: string[];
}
export interface Me {
  email: string;
  name: string;
  role: "admin" | "user";
}
type Status =
  | "loading"
  | "redirecting"
  | "signedOut"
  | "signedIn"
  | "denied"
  | "error";

const DEV_KEY = "retail-ai:dev-email";
let config: AuthConfig | null = null;
let devEmail: string | null = null;

function readDev(): string | null {
  try {
    return sessionStorage.getItem(DEV_KEY);
  } catch {
    return null;
  }
}
function writeDev(v: string | null) {
  try {
    if (v) sessionStorage.setItem(DEV_KEY, v);
    else sessionStorage.removeItem(DEV_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Extra headers for API calls. With Microsoft SSO the App Service cookie does the work. */
export async function authHeader(): Promise<Record<string, string>> {
  if (config?.mode === "dev") {
    const email = devEmail ?? readDev();
    return email ? { Authorization: `Dev ${email}` } : {};
  }
  return {};
}

/** Read the signed-in Microsoft user from App Service (/.auth/me). */
async function readAuthMe(
  url: string,
): Promise<{ email: string; name: string } | null> {
  const res = await fetch(apiUrl(url), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`/.auth/me answered ${res.status}`);
  const body = (await res.json()) as {
    user_id?: string;
    user_claims?: { typ: string; val: string }[];
  }[];
  const p = body?.[0];
  if (!p) return null;
  const claim = (...typs: string[]) =>
    typs
      .map((t) => p.user_claims?.find((c) => c.typ === t)?.val)
      .find(Boolean) ?? "";
  const email =
    claim(
      "preferred_username",
      "email",
      "upn",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    ) ||
    p.user_id ||
    "";
  const name = claim(
    "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  );
  return { email, name };
}

function toMicrosoft() {
  if (!config) return;
  // Come back to this page afterwards (a full address when the API is on another site)
  const back =
    (API_BASE ? window.location.origin : "") +
    window.location.pathname +
    window.location.search;
  window.location.assign(
    `${apiUrl(config.login_url)}?post_login_redirect_uri=${encodeURIComponent(back)}`,
  );
}

interface AuthState {
  status: Status;
  me: Me | null;
  config: AuthConfig | null;
  error: string | null;
  isAdmin: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

async function fetchMe(): Promise<Me> {
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: await authHeader(),
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Object.assign(new Error(body?.detail ?? `${res.status}`), {
      status: res.status,
    });
  return body as Me;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<AuthConfig | null>(null);

  const load = useCallback(async () => {
    try {
      const m = await fetchMe();
      setMe(m);
      setError(null);
      setStatus("signedIn");
    } catch (e) {
      const st = (e as { status?: number }).status;
      setMe(null);
      setError(e instanceof Error ? e.message : String(e));
      setStatus(st === 403 ? "denied" : st === 401 ? "signedOut" : "error");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/config"), {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`The API answered ${res.status}`);
        config = (await res.json()) as AuthConfig;
        if (!alive) return;
        setCfg(config);
        if (config.mode === "microsoft") {
          if (!config.ready)
            throw new Error(
              "Microsoft sign-in is not switched on for this app yet (App Service Authentication)",
            );
          const who = await readAuthMe(config.me_url);
          if (!alive) return;
          // Nobody signed in: go straight to Microsoft, then come back to this page
          if (!who) {
            setStatus("redirecting");
            toMicrosoft();
            return;
          }
        } else if (config.mode === "dev") {
          devEmail = readDev();
          if (!devEmail) {
            setStatus("signedOut");
            return;
          }
        }
        await load();
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
    const onExpired = () => {
      // Microsoft session ended: go straight back through Microsoft sign-in
      if (config?.mode === "microsoft") {
        setStatus("redirecting");
        toMicrosoft();
        return;
      }
      setStatus("signedOut");
      setMe(null);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => {
      alive = false;
      window.removeEventListener("auth:expired", onExpired);
    };
  }, [load]);

  const signIn = useCallback(() => {
    if (config?.mode === "microsoft") toMicrosoft();
  }, []);

  // Sign out and start again from the intro screen
  const signOut = useCallback(async () => {
    resetIntro();
    if (config?.mode === "microsoft") {
      // App Service ends the Microsoft session, then returns to the start page
      window.location.assign(
        `${apiUrl(config.logout_url)}?post_logout_redirect_uri=${encodeURIComponent(API_BASE ? `${window.location.origin}/` : "/")}`,
      );
      return;
    }
    if (config?.mode === "dev") {
      devEmail = null;
      writeDev(null);
    }
    // Local mode has no session to end: reload from the start page (intro, then the app)
    window.location.assign("/");
  }, []);

  return (
    <Ctx.Provider
      value={{
        status,
        me,
        config: cfg,
        error,
        isAdmin: me?.role === "admin",
        signIn,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
