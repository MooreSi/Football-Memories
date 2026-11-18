import { afterEach, expect, it, vi } from "vitest";

/** Hosted gateway task 080 (owner decision 011): a hosted user's copy of the app must never
 *  call the desktop helper, which holds the owner's Hudl and Veo sessions. */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load(hosted: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  const helper = await import("./helperBase");
  const hudl = await import("./hudl");
  const veo = await import("./veo");
  return { fetchSpy, helper, hudl, veo };
}

it("never sends a request to the helper in a hosted build", async () => {
  const { fetchSpy, helper, hudl, veo } = await load(true);
  expect(helper.HOSTED).toBe(true);
  await expect(hudl.hudlRequest("/account")).rejects.toThrow(/not available/i);
  await expect(veo.veoRequest("/status")).rejects.toThrow(/not available/i);
  await expect(helper.helperFetch("http://127.0.0.1:8766/status")).rejects.toThrow(/not available/i);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("still reaches the helper on the owner's own install (negative control)", async () => {
  const { fetchSpy, helper, hudl } = await load(false);
  expect(helper.HOSTED).toBe(false);
  await hudl.hudlRequest("/account");
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(String((fetchSpy.mock.calls[0] as unknown[])[0])).toContain("/account");
});
