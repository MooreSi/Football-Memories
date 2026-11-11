import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { DownloadFolderSettings } from "./DownloadFolder";

afterEach(() => vi.unstubAllGlobals());
const info = {
  folder: "/Users/owner/Football Memories/data/inbox", default_folder: "/Users/owner/Football Memories/data/inbox",
  is_default: true, free_bytes: 16 * 2 ** 30,
  files: [{ name: "hudl-abc-highest-1080p-1.mp4", size: 3.5 * 2 ** 30, modified: 1762780000 }],
};
const posted = (path: string) => vi.mocked(fetch).mock.calls.filter(c => String(c[0]).endsWith(path)).map(c => JSON.parse(String(c[1]?.body)));

it("shows where downloads are saved and lets the owner choose a new folder", async () => {
  stubFetch({ "http://127.0.0.1:8766/downloads": info, "http://127.0.0.1:8766/downloads/folder": { ...info, folder: "/Volumes/Archive", is_default: false } });
  renderWithProviders(<DownloadFolderSettings />);
  const region = await screen.findByRole("region", { name: "Downloaded files" });
  expect(await within(region).findByText(info.folder)).toBeInTheDocument();
  await userEvent.setup().click(within(region).getByRole("button", { name: /Change folder/ }));
  expect(posted("/downloads/folder")).toEqual([{ action: "choose" }]);
  expect(await within(region).findByText("/Volumes/Archive")).toBeInTheDocument();
  expect(within(region).getByRole("button", { name: /Use default folder/ })).toBeInTheDocument();
});

it("deletes a file only after confirmation, moving it to the Trash", async () => {
  stubFetch({ "http://127.0.0.1:8766/downloads": info, "http://127.0.0.1:8766/downloads/delete": { ...info, files: [], trashed_as: "x" } });
  renderWithProviders(<DownloadFolderSettings />);
  const user = userEvent.setup();
  const row = await screen.findByRole("listitem", { name: "hudl-abc-highest-1080p-1.mp4" });
  expect(within(row).getByText("3.5 GB")).toBeInTheDocument();
  await user.click(within(row).getByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("dialog", { name: "Delete hudl-abc-highest-1080p-1.mp4?" });
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(posted("/downloads/delete")).toEqual([]);
  await user.click(within(row).getByRole("button", { name: "Delete" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Move to Trash" }));
  expect(posted("/downloads/delete")).toEqual([{ name: "hudl-abc-highest-1080p-1.mp4" }]);
  expect(await screen.findByText(/No downloaded files/)).toBeInTheDocument();
});

it("explains when the desktop helper is not running", async () => {
  stubFetch({});
  renderWithProviders(<DownloadFolderSettings />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/desktop helper/);
});
