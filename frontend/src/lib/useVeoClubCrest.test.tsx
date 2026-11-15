import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useVeoClubCrest } from "./useVeoClubCrest";

// Owner request 2026-11-15: the crest Veo shows for the owner's team goes to the app's
// Veo home team (Settings) when that team has no crest; one already there is kept.
// The names in Veo's match report are not used: on the real account they were
// another club's name and the placeholder "Own team". Synthetic data only.
const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());

function Probe() { useVeoClubCrest(); return null; }

function stub(club: object, logos: Record<string, number>, veoTeam: string | null = "Riverside Reds") {
  const sent: { url: string; method: string; body?: FormData }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    sent.push({ url, method: init?.method ?? "GET", body: init?.body as FormData | undefined });
    if (url === `${H}/veo/club`) return new Response(JSON.stringify(club), { status: 200 });
    if (url === "/api/settings/home-teams") return new Response(JSON.stringify({ hudl: null, veo: veoTeam }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url === `${H}/veo/crest`) return new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), { status: 200 });
    if (url.startsWith("/api/team-logo?")) {
      const name = new URLSearchParams(url.split("?")[1]).get("name")!;
      return new Response(null, { status: logos[name] ?? 404 });
    }
    if (url === "/api/team-logo") return new Response(JSON.stringify({ saved: "x" }), { status: 200 });
    return new Response("{}", { status: 599 });
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Probe /></QueryClientProvider>);
  return sent;
}

it("gives Veo's crest to the Veo home team when it has none, and to no other name", async () => {
  const sent = stub({ names: ["Other Academy", "Own team"], crest: true }, {});
  await vi.waitFor(() => expect(sent.filter(s => s.method === "POST")).toHaveLength(1));
  const post = sent.find(s => s.method === "POST")!;
  expect(post.url).toBe("/api/team-logo");
  expect(post.body!.get("name")).toBe("Riverside Reds");
  expect((post.body!.get("file") as File).type).toBe("image/png");
});

it("keeps a crest the Veo home team already has", async () => {
  const sent = stub({ names: [], crest: true }, { "Riverside Reds": 200 });
  await vi.waitFor(() => expect(sent.some(s => s.url.startsWith("/api/team-logo?"))).toBe(true));
  await new Promise(r => setTimeout(r, 20));
  expect(sent.filter(s => s.method === "POST" || s.url.endsWith("/veo/crest"))).toEqual([]);
});

it("does nothing when Veo has no crest saved or no Veo home team is set", async () => {
  for (const [club, team] of [[{ names: [], crest: false }, "Riverside Reds"], [{ names: [], crest: true }, null]] as const) {
    const sent = stub(club, {}, team);
    await vi.waitFor(() => expect(sent.some(s => s.url === `${H}/veo/club`)).toBe(true));
    await new Promise(r => setTimeout(r, 20));
    expect(sent.filter(s => s.url.startsWith("/api/team-logo") || s.url.endsWith("/veo/crest"))).toEqual([]);
    vi.unstubAllGlobals();
  }
});
