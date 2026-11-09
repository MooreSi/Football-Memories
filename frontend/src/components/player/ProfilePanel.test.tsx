import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerProfile } from "../../api/types";
import { ProfilePanel } from "./ProfilePanel";

afterEach(() => vi.unstubAllGlobals());

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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/players/5/photo");
    expect(init.method).toBe("PUT");
    expect((init.body as FormData).get("file")).toBe(file);
    expect(init.headers).toBeUndefined();
  });

  it("shows the server's reason when a photo is refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "this file is not a picture" }), { status: 400, headers: { "Content-Type": "application/json" } })));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    await userEvent.upload(screen.getByLabelText("Choose a photo"), new File(["x"], "x.jpg", { type: "image/jpeg" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("this file is not a picture");
  });

  it("offers Remove photo only when there is a photo", async () => {
    renderPanel({ ...player, photo_url: "/api/players/5/photo?v=1" });
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("button", { name: /Remove photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change photo/ })).toBeInTheDocument();
  });
});
