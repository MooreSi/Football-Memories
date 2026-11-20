import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { VeoSharedLinks } from "./VeoSharedLinks";

// Owner request 2026-11-20: shared Veo match links, read with no Veo account entered.
const BASE = "http://127.0.0.1:8766";
const LINK = "https://app.veo.co/matches/20261115-match-15-nov-2026-vc376261/";
const SLUG = "20261115-match-15-nov-2026-vc376261";
afterEach(() => vi.unstubAllGlobals());
const calls = (path: string) => vi.mocked(fetch).mock.calls.filter(([u]) => u === `${BASE}${path}`);

it("adds a shared match link and clears the field", async () => {
  stubFetch({ [`${BASE}/veo/shared`]: [] });
  const user = userEvent.setup();
  renderWithProviders(<VeoSharedLinks />);
  await user.type(await screen.findByLabelText("Shared Veo match link"), LINK);
  await user.click(screen.getByRole("button", { name: "Add link" }));
  const post = calls("/veo/shared").find(([, init]) => init?.method === "POST");
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({ url: LINK });
  expect(screen.getByLabelText("Shared Veo match link")).toHaveValue("");
});

it("lists each saved link by its match title, or its address before it is read", async () => {
  stubFetch({ [`${BASE}/veo/shared`]: [
    { slug: SLUG, url: LINK, title: "251115 NL vs Bolehall Swifts" },
    { slug: "20261101-other-xx", url: "https://app.veo.co/matches/20261101-other-xx/", title: null },
  ] });
  renderWithProviders(<VeoSharedLinks />);
  const list = await screen.findByRole("list", { name: "Shared Veo match links" });
  expect(within(list).getByText("251115 NL vs Bolehall Swifts")).toBeInTheDocument();
  expect(within(list).getByText("https://app.veo.co/matches/20261101-other-xx/")).toBeInTheDocument();
});

it("deletes a link", async () => {
  stubFetch({ [`${BASE}/veo/shared`]: [{ slug: SLUG, url: LINK, title: "NL vs Bolehall" }],
    [`${BASE}/veo/shared/delete`]: { deleted: true } });
  renderWithProviders(<VeoSharedLinks />);
  await userEvent.setup().click(await screen.findByRole("button", { name: "Delete link NL vs Bolehall" }));
  expect(calls("/veo/shared/delete").map(([, init]) => JSON.parse(String(init?.body)))).toEqual([{ slug: SLUG }]);
});

it("shows why a link was refused", async () => {
  const fn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST"
    ? new Response(JSON.stringify({ detail: "That is not a Veo match link." }), { status: 400 })
    : new Response("[]", { status: 200 }));
  vi.stubGlobal("fetch", fn);
  const user = userEvent.setup();
  renderWithProviders(<VeoSharedLinks />);
  await user.type(await screen.findByLabelText("Shared Veo match link"), "https://example.test/x");
  await user.click(screen.getByRole("button", { name: "Add link" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("That is not a Veo match link.");
});
