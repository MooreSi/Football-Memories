import { act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { useHudlAutoCheck } from "./hudl/useHudlAutoCheck";
import { useVeoAutoCheck } from "./veo/useVeoAutoCheck";

// Owner request 2026-11-15: new Veo and Hudl matches show in the library on their own:
// checked on opening the app and on coming back to it, at most every six hours.
const H = "http://127.0.0.1:8766";
const now = 1_800_000_000_000;
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });
const posted = (path: string) => vi.mocked(fetch).mock.calls.filter(c => String(c[0]) === `${H}${path}` && c[1]?.body).map(c => JSON.parse(String(c[1]!.body)).action);

function Checks() { useHudlAutoCheck(); useVeoAutoCheck(); return <p>app</p>; }
const routes = (veoChecked: number | null, hudlChecked: number | null) => ({
  [`${H}/veo/account`]: { configured: true, busy: false, state: "ready", message: "", summary: null, library_checked_at: veoChecked },
  [`${H}/veo/library`]: [], [`${H}/veo/action`]: { accepted: true },
  [`${H}/account`]: { configured: true, busy: false, state: "ready", message: "", catalogue_checked_at: hudlChecked },
  [`${H}/library`]: [], [`${H}/account/action`]: { accepted: true },
});
const comeBack = () => act(() => { document.dispatchEvent(new Event("visibilitychange")); });

it("reads the Veo match list on opening the app when it is old, once", async () => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  stubFetch(routes(now / 1000 - 7 * 3600, now / 1000));
  renderWithProviders(<Checks />, "/");
  await vi.waitFor(() => expect(posted("/veo/action")).toEqual(["refresh"]));
  comeBack();
  await new Promise(r => setTimeout(r, 50));
  expect(posted("/veo/action")).toEqual(["refresh"]);
});

it("leaves Veo alone on a Veo match page, where it would stop the video", async () => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  stubFetch(routes(null, now / 1000));
  renderWithProviders(<Checks />, "/veo/veo-a");
  await new Promise(r => setTimeout(r, 50));
  expect(posted("/veo/action")).toEqual([]);
});

it("looks for new Hudl matches again on coming back to the app once the list is old", async () => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  stubFetch(routes(now / 1000, now / 1000 - 60));
  renderWithProviders(<Checks />, "/");
  await new Promise(r => setTimeout(r, 50));
  expect(posted("/account/action")).toEqual([]);
  vi.setSystemTime(now + 7 * 3600 * 1000);
  comeBack();
  await vi.waitFor(() => expect(posted("/account/action")).toEqual(["refresh"]));
});

// Owner decision 012 (2026-11-20): with no age group saved, a Hudl match never indexed
// still gets its tags read, without pressing Refresh.
it("indexes Hudl tags with no age group saved", async () => {
  vi.useFakeTimers({ now, toFake: ["Date"] });
  stubFetch({ ...routes(now / 1000, now / 1000),
    [`${H}/library`]: [{ id: "m1", title: "261108 U11 v Stoke", age_group: "U11", age_groups: ["U11"], capture_key: "k" }] });
  renderWithProviders(<Checks />, "/");
  await vi.waitFor(() => expect(posted("/account/action")).toEqual(["sync_tags"]));
});
