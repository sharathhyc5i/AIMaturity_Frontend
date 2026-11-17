/**
 * The intro (splash) plays once per browser tab session: on the first load, not on
 * reloads. Signing out clears the flag so the intro plays again.
 */
const KEY = "retail-ai:intro-seen";

export function introSeen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
export function markIntroSeen() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: intro plays each load */
  }
}
export function resetIntro() {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(SIDEBAR_KEY); // start again with the sidebar collapsed
    localStorage.removeItem("retail-ai:sidebar-rail"); // older builds kept it here
  } catch {
    /* ignore */
  }
}

/** Sidebar collapsed (1) or expanded (0) for this session. */
export const SIDEBAR_KEY = "retail-ai:sidebar-rail";
