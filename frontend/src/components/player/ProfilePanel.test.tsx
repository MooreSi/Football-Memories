import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerProfile } from "../../api/types";
import { ProfilePanel } from "./ProfilePanel";

// Every photo now goes through the crop popup (owner request 2026-11-10); jsdom has no canvas.
beforeEach(() => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 800, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    drawImage: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), fillStyle: "",
  }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function saveCrop() {
  await userEvent.click(within(await screen.findByRole("dialog", { name: "Crop photo" })).getByRole("button", { name: "Save photo" }));
}

const player: PlayerProfile = {
  id: 5, display_name: "Sam Example", shirt_number: null, position: null, photo_url: null, is_primary: true,
  totals: { matches: 1, moments: 1, unwatched: 1, favourites: 0 }, categories: [], teams: [], per_match: [],
  teammates: [], first_match_date: null, latest_match_date: null,
};

function renderPanel(p: PlayerProfile = player) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><ProfilePanel player={p} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfilePanel photo", () => {
  it("uploads the chosen file as multipart form data to the player's photo endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(player), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "me.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Choose a photo"), file);
    await saveCrop();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/players/5/photo");
    expect(init.method).toBe("PUT");
    const sent = (init.body as FormData).get("file") as File;
    expect(sent.name).toBe("me.jpg");
    expect(sent.type).toBe("image/jpeg");
    expect(init.headers).toBeUndefined();
  });

  it("shows the server's reason when a photo is refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "this file is not a picture" }), { status: 400, headers: { "Content-Type": "application/json" } })));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    await userEvent.upload(screen.getByLabelText("Choose a photo"), new File(["x"], "x.jpg", { type: "image/jpeg" }));
    await saveCrop();
    expect(await screen.findByRole("alert")).toHaveTextContent("this file is not a picture");
  });

  it("offers Remove photo only when there is a photo", async () => {
    renderPanel({ ...player, photo_url: "/api/players/5/photo?v=1" });
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("button", { name: /Remove photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change photo/ })).toBeInTheDocument();
  });
});

describe("ProfilePanel club and card style", () => {
  it("saves the club the player plays for and the card style", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(player), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    await userEvent.type(screen.getByLabelText("Plays for"), "Aston Villa");
    await userEvent.click(screen.getByRole("radio", { name: "Gold" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/players/5");
    expect(JSON.parse(String(init.body))).toMatchObject({ club_name: "Aston Villa", card_style: "gold" });
  });

  it("shows the club in the Teams panel once saved", () => {
    renderPanel({ ...player, club_name: "Aston Villa" });
    expect(screen.getByText("Plays for")).toBeInTheDocument();
    expect(screen.getByText("Aston Villa")).toBeInTheDocument();
  });
});

// Owner request 2026-11-13: "Tagged with" is removed from My Player.
it("no longer shows a Tagged with panel, even with teammates", () => {
  renderPanel({ ...player, teammates: [{ id: 9, display_name: "Alex Example", shared_moments: 4 }] });
  expect(screen.getByRole("region", { name: "Teams and numbers" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Tagged with" })).toBeNull();
  expect(screen.queryByText("Alex Example")).toBeNull();
});
