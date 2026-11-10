import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PlayerProfile } from "../../api/types";
import { ProfilePanel } from "./ProfilePanel";

const player: PlayerProfile = {
  id: 5, display_name: "Sam Example", shirt_number: null, position: null, photo_url: null, is_primary: true,
  totals: { matches: 0, moments: 0, unwatched: 0, favourites: 0 }, categories: [], teams: [], per_match: [],
  teammates: [], first_match_date: null, latest_match_date: null,
};
const draw = vi.fn();
const translate = vi.fn();

beforeEach(() => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    drawImage: draw, fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate, rotate: vi.fn(), scale: vi.fn(), fillStyle: "",
  }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob([new Uint8Array(200_000)], { type: "image/jpeg" }));
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function renderPanel() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(player), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ProfilePanel player={player} /></MemoryRouter></QueryClientProvider>);
  return fetchMock;
}
const big = () => new File([new Uint8Array(12 * 1024 * 1024)], "phone.jpg", { type: "image/jpeg" });

it("crops, resizes and uploads a large photo instead of failing", async () => {
  const fetchMock = renderPanel();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Edit/ }));
  await user.upload(screen.getByLabelText("Choose a photo"), big());
  const dialog = await screen.findByRole("dialog", { name: "Crop photo" });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText("Zoom"), { target: { value: "2" } });
  await user.click(within(dialog).getByRole("button", { name: "Rotate" }));
  await user.click(within(dialog).getByRole("button", { name: "Save photo" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/players/5/photo");
  const sent = (init.body as FormData).get("file") as File;
  expect(sent.type).toBe("image/jpeg");
  expect(sent.size).toBeLessThan(1024 * 1024);
});

it("opens the crop popup for every photo, and cancel uploads nothing", async () => {
  const fetchMock = renderPanel();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Edit/ }));
  await user.upload(screen.getByLabelText("Choose a photo"), new File([new Uint8Array(10)], "me.png", { type: "image/png" }));
  const dialog = await screen.findByRole("dialog", { name: "Crop photo" });
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("explains when the browser cannot open the picture", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("decode"); }));
  renderPanel();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Edit/ }));
  await user.upload(screen.getByLabelText("Choose a photo"), big());
  expect(await screen.findByText(/could not open this picture/)).toBeInTheDocument();
});

it("starts a portrait photo aligned to the top so the head stays in frame", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1000, height: 2000, close: vi.fn() })));
  renderPanel();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Edit/ }));
  await user.upload(screen.getByLabelText("Choose a photo"), new File([new Uint8Array(10)], "me.jpg", { type: "image/jpeg" }));
  await screen.findByRole("dialog", { name: "Crop photo" });
  // Preview canvas is 640 px: centred would translate y by 320; top-aligned moves it down by half the overflow.
  await vi.waitFor(() => expect(translate).toHaveBeenLastCalledWith(320, 640));
});

it("draws the popup above the whole page so Save is never covered", async () => {
  renderPanel();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Edit/ }));
  await user.upload(screen.getByLabelText("Choose a photo"), big());
  const dialog = await screen.findByRole("dialog", { name: "Crop photo" });
  const overlay = dialog.parentElement!;
  expect(overlay.parentElement).toBe(document.body);
  expect(overlay.className).toMatch(/z-\[100\]/);
  expect(dialog.className).toMatch(/overflow-y-auto/);
  expect(dialog.className).toMatch(/max-h-/);
});
