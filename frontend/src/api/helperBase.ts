/** Where the page reaches the desktop helper (owner request 2026-11-11, D-028).
 *  On the Mac itself the helper answers at 127.0.0.1:8766. A phone or tablet on the
 *  local network cannot use that address (it is the phone itself), so the app's web
 *  server forwards /helper/ to the helper and the page uses that instead. */
export const DIRECT = "http://127.0.0.1:8766";

/** Hosted gateway task 080 (owner decision 011): a hosted user's copy is built with
 *  VITE_FM_HOSTED=1 and never talks to the desktop helper, which holds the owner's Hudl
 *  and Veo sessions. Every helper request goes through helperFetch, which refuses there. */
export const HOSTED = import.meta.env.VITE_FM_HOSTED === "1";
export const HOSTED_UNAVAILABLE = "Hudl and Veo are not available in the hosted app yet.";

export function helperFetch(input: string, init?: RequestInit): Promise<Response> {
  if (HOSTED) return Promise.reject(new Error(HOSTED_UNAVAILABLE));
  return fetch(input, init);
}

export function helperBase(place: { hostname: string; origin: string } = window.location): string {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(place.hostname) ? DIRECT : `${place.origin}/helper`;
}

/** The helper writes its own links as 127.0.0.1:8766; point them at `base` instead. */
export function localiseHelperUrls<T>(data: T, base: string): T {
  if (base === DIRECT) return data;
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") return value.startsWith(`${DIRECT}/`) ? base + value.slice(DIRECT.length) : value;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
    return value;
  };
  return walk(data) as T;
}
