import { afterEach, expect, it, vi } from "vitest";

/** Hosted gateway phase 2 (owner sign-off 2026-11-19; rewritten from task 080's "never any
 *  helper request"): a hosted build talks only to its own /helper (the user's capture
 *  container), never to 127.0.0.1:8766, and to nothing at all for a service whose
 *  permission the user has not confirmed. */

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
  const perms = await import("./hostedPermissions");
  const hudl = await import("./hudl");
  const veo = await import("./veo");
  return { fetchSpy, helper, perms, hudl, veo };
}

const called = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.map((c) => String((c as unknown[])[0]));

it("before permission a hosted build sends nothing to the helper", async () => {
  const { fetchSpy, hudl, veo } = await load(true);
  await expect(hudl.hudlRequest("/account")).rejects.toThrow(/Settings/);
  await expect(veo.veoRequest("/account")).rejects.toThrow(/Settings/);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("after permission it uses only its own /helper, per service", async () => {
  const { fetchSpy, helper, perms, hudl, veo } = await load(true);
  expect(helper.HUDL_BASE()).toBe(`${window.location.origin}/helper`);
  perms.setHostedPermissions({ hudl: true, veo: false });
  await hudl.hudlRequest("/account");
  await expect(veo.veoRequest("/account")).rejects.toThrow(/Settings/);
  expect(called(fetchSpy)).toEqual([`${window.location.origin}/helper/account`]);
});

it("a hosted build refuses the owner's helper address even with permission", async () => {
  const { fetchSpy, helper, perms } = await load(true);
  perms.setHostedPermissions({ hudl: true, veo: true });
  await expect(helper.helperFetch("http://127.0.0.1:8766/account")).rejects.toThrow();
  await expect(helper.helperFetch("https://evil.example/helper/account")).rejects.toThrow();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("the owner's own install still reaches its helper directly (negative control)", async () => {
  const { fetchSpy, helper, hudl } = await load(false);
  expect(helper.HOSTED).toBe(false);
  await hudl.hudlRequest("/account");
  expect(called(fetchSpy)[0]).toContain("/account");
});
