import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { VeoLibrary } from "./VeoLibrary";

// Spec 260 task 1: Veo matches from the helper's cache in All matches. Synthetic data.
const LIB = "http://127.0.0.1:8766/veo/library";
const matches = [
  { id: "veo-a", source: "veo", title: "260901 Riverside U11 vs Rovers", age_group: "U11", age_groups: ["U11"], season_label: "2026/27",
    available: true, expiration_status: "does-not-expire-soon", score: { ours: 3, theirs: 1 }, moments: [{ id: "h1", category: "GOAL", time_s: 60, duration_s: 10 }] },
  { id: "veo-b", source: "veo", title: "250301 Riverside U10 vs City", age_group: "U10", age_groups: ["U10"], season_label: "2024/25",
    available: false, expiration_status: "expired", score: null, moments: [] },
  { id: "veo-c", source: "veo", title: "261001 Riverside U11 vs Town", age_group: "U11", age_groups: ["U11"], season_label: "2026/27",
    available: true, expiration_status: "expires-soon", score: null, moments: [] },
];
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it("lists cached Veo matches with links, score and expiry, filtered like All matches", async () => {
  stubFetch({ [LIB]: matches });
  renderWithProviders(<VeoLibrary filters={{ age: "U11", season: "", search: "" }} />);
  const a = await screen.findByRole("link", { name: /Rovers/ });
  expect(a).toHaveAttribute("href", "/veo/veo-a"); // owner request 2026-11-13: a Veo card opens its full match page, like Hudl
  expect(a).toHaveTextContent("3–1");
  expect(a).toHaveTextContent("1 highlight");
  expect(within(screen.getByRole("link", { name: /Town/ })).getByText("Video expires soon on Veo")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /City/ })).toBeNull();
  expect(screen.getByText(/2 of 3 cached Veo matches/)).toBeInTheDocument();
});

it("marks a match whose video Veo has expired", async () => {
  stubFetch({ [LIB]: matches });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "City" }} />);
  const b = await screen.findByRole("link", { name: /City/ });
  expect(within(b).getByText("Video expired on Veo")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Rovers/ })).toBeNull();
});

it("shows nothing when Settings has Show Veo off, and an empty cache explains Refresh", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["veo"]));
  stubFetch({ [LIB]: matches });
  const { unmount } = renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(screen.queryByRole("region", { name: "Veo match library" })).toBeNull();
  unmount();
  localStorage.clear();
  stubFetch({ [LIB]: [] });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(await screen.findByText(/Refresh matches in Settings/)).toBeInTheDocument();
});

it("says the helper is unavailable without inventing matches", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  await screen.findByText(/Veo matches unavailable/);
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry connection" }));
});

it("shows the poster the helper saved from Veo's thumbnail", async () => {
  stubFetch({ [LIB]: [{ ...matches[0], poster_url: "http://127.0.0.1:8766/veo/match/veo-a/poster" }] });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  const link = await screen.findByRole("link", { name: /Rovers/ });
  expect(within(link).getByRole("img")).toHaveAttribute("src", "http://127.0.0.1:8766/veo/match/veo-a/poster");
});

// Owner request 2026-11-15: a Refresh Veo button on the library, like Refresh Hudl.
const ACCOUNT = "http://127.0.0.1:8766/veo/account";
const ACTION = "http://127.0.0.1:8766/veo/action";
const idle = { configured: true, busy: false, state: "ready", message: "", summary: null };

it("refreshes the Veo matches from the library and shows the progress", async () => {
  stubFetch({ [LIB]: matches, [ACCOUNT]: idle, [ACTION]: { accepted: true } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  await userEvent.setup().click(await screen.findByRole("button", { name: /Refresh Veo/ }));
  const posts = vi.mocked(fetch).mock.calls.filter(c => String(c[0]) === ACTION).map(c => JSON.parse(String(c[1]?.body)));
  expect(posts).toEqual([{ action: "refresh" }]);
});

it("cannot refresh while Veo is busy, and says what it is doing", async () => {
  stubFetch({ [LIB]: matches, [ACCOUNT]: { ...idle, busy: true, state: "working", message: "Listing Veo matches… (160 so far)" } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(await screen.findByText("Listing Veo matches… (160 so far)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Refresh Veo/ })).toBeDisabled();
});

it("offers no refresh until a Veo account is saved", async () => {
  stubFetch({ [LIB]: [], [ACCOUNT]: { ...idle, configured: false } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(await screen.findByText(/No Veo matches cached yet/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Refresh Veo/ })).toBeDisabled();
});

// Owner request 2026-11-20: shared match links need no account, so Refresh reads them.
it("refreshes shared match links with no Veo account saved", async () => {
  stubFetch({ [LIB]: [], [ACCOUNT]: { ...idle, configured: false, shared: 1 }, [ACTION]: { accepted: true } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  const button = await screen.findByRole("button", { name: /Refresh Veo/ });
  await vi.waitFor(() => expect(button).toBeEnabled());
  await userEvent.setup().click(button);
  const posts = vi.mocked(fetch).mock.calls.filter(c => String(c[0]) === ACTION).map(c => JSON.parse(String(c[1]?.body)));
  expect(posts).toEqual([{ action: "refresh" }]);
});

// Owner request 2026-11-15: Veo cards like Hudl's, with the date and the crest/score pill.
it("shows each Veo match's date and the crest and score pill, like a Hudl card", async () => {
  stubFetch({ [LIB]: matches, "/api/settings/home-teams": { hudl: null, veo: "Riverside U11" } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  const a = await screen.findByRole("link", { name: /Rovers/ });
  expect(a).toHaveTextContent("1st September 2026");
  expect(await within(a).findByRole("group", { name: "Riverside U11 3, Rovers 1" })).toBeInTheDocument();
});

// Owner request 2026-11-15: the account films two clubs; each card names the club its title names.
it("names the club each Veo title names on its score pill", async () => {
  const two = [
    { ...matches[0], id: "veo-a", title: "260901 RJ vs Rovers", team: "Hill Town" },
    { ...matches[0], id: "veo-b", title: "260902 HT vs Town", team: null },
  ];
  stubFetch({ [LIB]: two, "/api/settings/home-teams": { hudl: null, veo: "Riverside Juniors" } });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  const a = await screen.findByRole("link", { name: /Rovers/ });
  expect(await within(a).findByRole("group", { name: /^Riverside Juniors \d+, Rovers/ })).toBeInTheDocument();
  const b = screen.getByRole("link", { name: /Town/ });
  expect(within(b).getByRole("group", { name: /^Hill Town \d+, Town/ })).toBeInTheDocument();
});
