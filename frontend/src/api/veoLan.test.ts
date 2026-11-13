import { afterEach, expect, it, vi } from "vitest";

// Owner report 2026-11-13: Safari at http://192.168.0.53:8765 showed "cannot play" on a
// Veo match. The page reaches the helper through /helper there, but the stream and
// poster addresses the helper writes (127.0.0.1:8766) were passed on unchanged, and the
// helper refuses that origin. Hudl's are rewritten; Veo's must be too.
vi.mock("./hudl", () => ({ HUDL: "http://192.168.0.53:8765/helper" }));
afterEach(() => vi.unstubAllGlobals());

it("points the helper's stream and poster addresses at /helper when opened over the network", async () => {
  const { veoRequest } = await import("./veo");
  const fetched: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    fetched.push(url);
    const body = url.endsWith("/account")
      ? { state: "ready", stream_url: "http://127.0.0.1:8766/veo/stream/tok" }
      : [{ id: "veo-a", poster_url: "http://127.0.0.1:8766/veo/match/veo-a/poster", title: "Riverside vs Town" }];
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  const status = await veoRequest<{ stream_url: string }>("/account");
  expect(status.stream_url).toBe("http://192.168.0.53:8765/helper/veo/stream/tok");
  const library = await veoRequest<{ poster_url: string; title: string }[]>("/library");
  expect(library[0].poster_url).toBe("http://192.168.0.53:8765/helper/veo/match/veo-a/poster");
  expect(library[0].title).toBe("Riverside vs Town");
  expect(fetched).toEqual(["http://192.168.0.53:8765/helper/veo/account", "http://192.168.0.53:8765/helper/veo/library"]);
});
