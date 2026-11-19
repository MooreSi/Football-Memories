import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

/** Owner request 2026-11-19: a family signs straight into their library, so the library
 *  itself carries the way back to their account (password, two-step sign-in, sign out).
 *  Only a hosted copy has a gateway account; the owner's own install shows nothing. */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(hosted: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  return (await import("./HostedAccountLink")).HostedAccountLink;
}

it("a hosted library links to the family's gateway account page", async () => {
  const Link = await load(true);
  render(<Link />);
  const link = screen.getByRole("link", { name: "Your account" });
  expect(link.getAttribute("href")).toBe("/_portal/account");
});

it("the owner's own install has no account link (negative control)", async () => {
  const Link = await load(false);
  const { container } = render(<Link />);
  expect(container.innerHTML).toBe("");
});
