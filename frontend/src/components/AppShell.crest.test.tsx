import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

// Owner answer 2026-11-16: the Veo account's crest is Racing Club Warwick's, not the Veo
// home team's (Norton Lindsay), and Veo's report names are unreliable, so the app no
// longer gives that crest to any club on its own. Synthetic data only.
const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());

it("never uploads the Veo account crest as a club's crest", async () => {
  const sent: { url: string; method: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    sent.push({ url, method: init?.method ?? "GET" });
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url === `${H}/veo/club`) return json({ names: ["Other Academy", "Own team"], crest: true });
    if (url === "/api/settings/home-teams") return json({ hudl: null, veo: "Riverside Reds" });
    if (url === `${H}/veo/crest`) return new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), { status: 200 });
    if (url.startsWith("/api/team-logo")) return new Response(null, { status: 404 });
    return new Response("{}", { status: 503 });
  }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/settings"]}><AppShell /></MemoryRouter>
    </QueryClientProvider>,
  );
  await vi.waitFor(() => expect(sent.some((s) => s.url === `${H}/veo/status` || s.url.startsWith(`${H}/`))).toBe(true));
  await new Promise((r) => setTimeout(r, 100));
  expect(sent.filter((s) => s.method === "POST" && s.url === "/api/team-logo")).toEqual([]);
  expect(sent.filter((s) => s.url === `${H}/veo/crest`)).toEqual([]);
});
