import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

// Spec 340 / owner decision 013: a hosted library's Update section and title-bar button,
// served by the gateway. The gateway does the GitHub check; the page never contacts GitHub.
const OLD = "a".repeat(40), NEW = "b".repeat(40);
const status = (over: object = {}) => ({ current: OLD, latest: NEW, available: true, auto_update: false, checked_at: "2026-11-20T10:00:00Z", ...over });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

function gateway(state: object) {
  const fn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u === "/_portal/api/me") return Response.json({ csrf_token: "tok" });
    if (u === "/_portal/api/update/auto") return Response.json({ ...state, auto_update: JSON.parse(String(init?.body)).enabled });
    if (u === "/_portal/api/update/apply") return Response.json({ ...state, current: NEW, available: false });
    if (u === "/_portal/api/update") return Response.json(state);
    if (u === "/api/health") return Response.json({ status: "ok" });
    return new Response("{}", { status: 599 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function show(element: "settings" | "badge") {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", "1");
  vi.doMock("../../lib/reloadPage", () => ({ reloadPage: vi.fn() }));
  const mod = await import("./HostedUpdateSettings");
  const Ui = element === "settings" ? mod.HostedUpdateSettings : mod.HostedUpdateBadge;
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Ui /></MemoryRouter></QueryClientProvider>);
}

const posts = (fn: ReturnType<typeof gateway>, url: string) =>
  fn.mock.calls.filter(([u, i]) => String(u) === url && i?.method === "POST");

it("shows this library's version, the newer one and Update now", async () => {
  gateway(status());
  await show("settings");
  expect(await screen.findByText(OLD.slice(0, 7))).toBeInTheDocument();
  expect(screen.getByText(NEW.slice(0, 7))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Update now" })).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: "Update automatically" })).not.toBeChecked();
});

it("updates with the session's CSRF token and says it is restarting", async () => {
  const fn = gateway(status());
  await show("settings");
  await userEvent.setup().click(await screen.findByRole("button", { name: "Update now" }));
  const [[, init]] = posts(fn, "/_portal/api/update/apply");
  expect(new Headers(init?.headers).get("X-CSRF-Token")).toBe("tok");
  expect(await screen.findByRole("status")).toHaveTextContent(/reloads by itself/);
});

it("saves the Update automatically tick box", async () => {
  const fn = gateway(status());
  await show("settings");
  await userEvent.setup().click(await screen.findByRole("checkbox", { name: "Update automatically" }));
  const [[, init]] = posts(fn, "/_portal/api/update/auto");
  expect(JSON.parse(String(init?.body))).toEqual({ enabled: true });
  expect(await screen.findByRole("checkbox", { name: "Update automatically" })).toBeChecked();
});

it("says when the library is up to date and offers no button", async () => {
  gateway(status({ current: NEW, available: false }));
  await show("settings");
  expect(await screen.findByText(/up to date/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Update now" })).toBeNull();
});

it("shows Update available in the title bar, opening Settings > Update", async () => {
  gateway(status());
  await show("badge");
  expect(await screen.findByRole("link", { name: "Update available" })).toHaveAttribute("href", "/settings/update");
});

it("shows no title-bar button when updates are automatic or none is ready", async () => {
  gateway(status({ auto_update: true }));
  await show("badge");
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("link", { name: "Update available" })).toBeNull();
  vi.unstubAllGlobals();
  gateway(status({ available: false }));
  await show("badge");
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("link", { name: "Update available" })).toBeNull();
});

it("never asks GitHub from the page", async () => {
  const fn = gateway(status());
  await show("settings");
  await screen.findByRole("button", { name: "Update now" });
  expect(fn.mock.calls.every(([u]) => String(u).startsWith("/"))).toBe(true);
});
