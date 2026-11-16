import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { VeoExpiryPanel } from "./VeoExpiryPanel";
import { DownloadedPage } from "../../pages/DownloadedPage";

// Spec 280: a list of Veo matches to save before Veo deletes their video.
const H = "http://127.0.0.1:8766";
const today = new Date(2026, 10, 16);
const library = [
  { id: "veo-a", source: "veo", title: "251201 NL v Tamworth", age_group: "U11", available: true, expiration_status: "expires-soon" },
  { id: "veo-b", source: "veo", title: "260301 NL v Coleshill", age_group: "U11", available: true, expiration_status: "does-not-expire-soon" },
  { id: "veo-c", source: "veo", title: "260310 NL v Leek", age_group: "U11", available: true, expiration_status: "does-not-expire-soon" },
  { id: "veo-x", source: "veo", title: "240901 NL v Rugby", age_group: "U10", available: false, expiration_status: "expired" },
];
const index = [{ kind: "match", match_id: "veo-c", matches: ["veo-c"], title: "260310 NL v Leek", file: "Leek.mp4",
  url: `${H}/files/s/Leek.mp4`, moment_count: 0, codes: [], combined: false, created: 0, size: 1, modified: 0 }];

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it("lists unsaved Veo matches soonest first with days left and a link to save each", async () => {
  stubFetch({ [`${H}/veo/library`]: library, [`${H}/downloads/index`]: index });
  renderWithProviders(<VeoExpiryPanel today={today} />);
  const panel = await screen.findByRole("region", { name: /Before Veo deletes them/ });
  const rows = within(within(panel).getByRole("list", { name: "Not saved yet" })).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent(/Tamworth/);
  expect(rows[0]).toHaveTextContent(/about 15 days left/);
  expect(within(rows[0]).getByRole("link", { name: /Tamworth/ })).toHaveAttribute("href", "/veo/veo-a");
  expect(rows[1]).toHaveTextContent(/Coleshill/);
  expect(rows[1]).toHaveTextContent(/about 105 days left/);
  expect(within(panel).getByText(/1 saved/)).toBeInTheDocument();
  expect(within(panel).queryByText(/Leek/)).toBeNull();
});

it("changes the estimate when the owner picks how long Veo keeps video, and remembers it", async () => {
  stubFetch({ [`${H}/veo/library`]: library, [`${H}/downloads/index`]: index });
  renderWithProviders(<VeoExpiryPanel today={today} />);
  const panel = await screen.findByRole("region", { name: /Before Veo deletes them/ });
  await userEvent.selectOptions(within(panel).getByLabelText(/Veo keeps video for/), "6");
  expect(within(within(panel).getByRole("list", { name: "Not saved yet" })).getAllByRole("listitem")[1]).toHaveTextContent(/Coleshill.*past the estimate/);
  expect(localStorage.getItem("fm.veo.retentionMonths")).toBe("6");
});

it("shows the matches that expired on Veo before they were saved", async () => {
  stubFetch({ [`${H}/veo/library`]: library, [`${H}/downloads/index`]: index });
  renderWithProviders(<VeoExpiryPanel today={today} />);
  const panel = await screen.findByRole("region", { name: /Before Veo deletes them/ });
  const lost = within(panel).getByText(/Expired on Veo before they were saved \(1\)/);
  await userEvent.click(lost);
  expect(within(panel).getByText(/Rugby/)).toBeVisible();
});

it("shows nothing when there are no Veo matches", async () => {
  stubFetch({ [`${H}/veo/library`]: [], [`${H}/downloads/index`]: [] });
  renderWithProviders(<VeoExpiryPanel today={today} />);
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("region", { name: /Before Veo deletes them/ })).toBeNull();
});

it("appears on the Downloaded page", async () => {
  stubFetch({ [`${H}/veo/library`]: library, [`${H}/downloads/index`]: index, [`${H}/library`]: [] });
  renderWithProviders(<DownloadedPage />);
  expect(await screen.findByRole("region", { name: /Before Veo deletes them/ })).toBeInTheDocument();
});
