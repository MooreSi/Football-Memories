import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useVeoClubCrest } from "./useVeoClubCrest";

// Owner request 2026-11-15: the club's crest from Veo, for any of its names the app has
// no crest for. A crest the app already has is never replaced. Synthetic data only.
const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());

function Probe() { useVeoClubCrest(); return null; }

function stub(club: object, logos: Record<string, number>) {
  const sent: { url: string; method: string; body?: FormData }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    sent.push({ url, method: init?.method ?? "GET", body: init?.body as FormData | undefined });
    if (url === `${H}/veo/club`) return new Response(JSON.stringify(club), { status: 200 });
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

it("gives Veo's crest to each club name that has none, and no other", async () => {
  const sent = stub({ names: ["Riverside FC", "Riverside Reds"], crest: true }, { "Riverside FC": 200 });
  await vi.waitFor(() => expect(sent.filter(s => s.method === "POST")).toHaveLength(1));
  const post = sent.find(s => s.method === "POST")!;
  expect(post.url).toBe("/api/team-logo");
  expect(post.body!.get("name")).toBe("Riverside Reds");
  expect((post.body!.get("file") as File).type).toBe("image/png");
});

it("does nothing when Veo has no crest saved", async () => {
  const sent = stub({ names: ["Riverside FC"], crest: false }, {});
  await vi.waitFor(() => expect(sent.some(s => s.url === `${H}/veo/club`)).toBe(true));
  await new Promise(r => setTimeout(r, 20));
  expect(sent.filter(s => s.url.startsWith("/api/team-logo") || s.url.endsWith("/veo/crest"))).toEqual([]);
});
