import { HOSTED } from "./hostedFlag";
import { hostedAllows, serviceOf } from "./hostedPermissions";
/** Where the page reaches the desktop helper (owner request 2026-11-11, D-028).
 *  On the Mac itself the helper answers at 127.0.0.1:8766. A phone or tablet on the
 *  local network cannot use that address (it is the phone itself), so the app's web
 *  server forwards /helper/ to the helper and the page uses that instead. */
export const DIRECT = "http://127.0.0.1:8766";

/** Hosted gateway (owner decision 011). Phase 1 (task 080): a hosted user's copy never talks
 *  to the owner's desktop helper. Phase 2 (owner sign-off 2026-11-19): it talks only to its
 *  own /helper (the user's capture container, through the gateway), and only for a service
 *  whose permission the user has confirmed. Every helper request goes through helperFetch. */
export { HOSTED } from "./hostedFlag";
export const HOSTED_UNAVAILABLE = "Confirm your own permission in Settings, Connections first.";

export function helperFetch(input: string, init?: RequestInit): Promise<Response> {
  if (HOSTED) {
    const own = `${window.location.origin}/helper/`;
    if (!input.startsWith(own)) return Promise.reject(new Error("Not this library's helper."));
    if (!hostedAllows(serviceOf(input))) return Promise.reject(new Error(HOSTED_UNAVAILABLE));
  }
  return fetch(input, init);
}

export function helperBase(place: { hostname: string; origin: string } = window.location): string {
  if (HOSTED) return `${place.origin}/helper`;
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(place.hostname) ? DIRECT : `${place.origin}/helper`;
}

export const HUDL_BASE = (): string => helperBase();

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
