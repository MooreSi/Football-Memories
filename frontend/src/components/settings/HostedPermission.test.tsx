import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";

/** Phase 2, task 030 (owner-approved wording): a hosted user confirms their own permission
 *  for each service before its controls appear. Sent to the gateway with the CSRF token. */

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

const WORDING = "I have permission from Hudl (or Veo) to access my account with automated tools, and I will only save videos my account can already view.";

it("the confirm button needs the tick, then posts with the token", async () => {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", "1");
  const posts: { url: string; headers: Record<string, string> }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    if (init.method === "POST") {
      posts.push({ url, headers: Object.fromEntries(new Headers(init.headers).entries()) });
      return new Response("{}", { status: 200 });
    }
    if (url === "/_portal/api/me") return new Response(JSON.stringify({ csrf_token: "tok-1" }), { status: 200 });
    return new Response(JSON.stringify({ wording: WORDING, hudl: { confirmed_at: null }, veo: { confirmed_at: null } }), { status: 200 });
  }));
  const { HostedPermission } = await import("./HostedPermission");
  renderWithProviders(<HostedPermission service="hudl" />);
  expect(await screen.findByText(WORDING)).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Confirm for Hudl" });
  expect(button).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(button);
  await waitFor(() => expect(posts).toHaveLength(1));
  expect(posts[0].url).toBe("/_portal/api/connections/hudl/confirm");
  expect(posts[0].headers["x-csrf-token"]).toBe("tok-1");
});
