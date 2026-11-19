import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

/** Owner request 2026-11-19: the gateway's admin account has its own library, and only the
 *  admin sees an Admin button in the title bar that opens the admin console. The gateway's
 *  admin API checks the role itself; this button is the way there, not the guard. */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load(hosted: boolean, me: { status: number; body?: unknown }) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const fetchMock = vi.fn(async () => new Response(me.body === undefined ? null : JSON.stringify(me.body), { status: me.status }));
  vi.stubGlobal("fetch", fetchMock);
  const { HostedAdminLink } = await import("./HostedAdminLink");
  return { HostedAdminLink, fetchMock };
}

it("the admin's hosted library shows an Admin button to the console", async () => {
  const { HostedAdminLink, fetchMock } = await load(true, { status: 200, body: { role: "admin" } });
  render(<HostedAdminLink />);
  const link = await screen.findByRole("link", { name: "Admin console" });
  expect(link.getAttribute("href")).toBe("/_portal/admin");
  expect(fetchMock).toHaveBeenCalledWith("/_portal/api/me", expect.objectContaining({ credentials: "same-origin" }));
});

it("a family's hosted library shows no Admin button (negative control)", async () => {
  const { HostedAdminLink, fetchMock } = await load(true, { status: 200, body: { role: "user" } });
  const { container } = render(<HostedAdminLink />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 0));
  expect(container.innerHTML).toBe("");
});

it("a failed check shows no Admin button", async () => {
  const { HostedAdminLink, fetchMock } = await load(true, { status: 401 });
  const { container } = render(<HostedAdminLink />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 0));
  expect(container.innerHTML).toBe("");
});

it("the owner's own install shows nothing and asks nothing", async () => {
  const { HostedAdminLink, fetchMock } = await load(false, { status: 200, body: { role: "admin" } });
  const { container } = render(<HostedAdminLink />);
  await new Promise((r) => setTimeout(r, 0));
  expect(container.innerHTML).toBe("");
  expect(fetchMock).not.toHaveBeenCalled();
});
