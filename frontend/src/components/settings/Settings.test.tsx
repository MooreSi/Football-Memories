import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorageHealth } from "../../api/types";
import { renderWithProviders } from "../../test/render";
import { PlaybackSettings } from "./PlaybackSettings";
import { StorageSettings } from "./StorageSettings";

afterEach(() => vi.unstubAllGlobals());

function api(routes: Record<string, unknown>) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const data = method === "PUT" ? { clip_pre_s: body.clip_pre_s, clip_post_s: body.clip_post_s } : routes[url];
    return new Response(JSON.stringify(data), { status: data === undefined ? 599 : 200, headers: { "Content-Type": "application/json" } });
  }));
  return calls;
}

describe("PlaybackSettings", () => {
  it("previews the brief's 15:32 example with the saved timing", async () => {
    api({ "/api/settings": { clip_pre_s: 8, clip_post_s: 5 } });
    renderWithProviders(<PlaybackSettings />);
    const example = await screen.findByText(/A save tagged at/);
    expect(example).toHaveTextContent("A save tagged at 15:32 plays from 15:24 to 15:37 (13 seconds).");
  });

  it("saves new timing with a PUT and confirms", async () => {
    const calls = api({ "/api/settings": { clip_pre_s: 8, clip_post_s: 5 } });
    renderWithProviders(<PlaybackSettings />);
    fireEvent.change(await screen.findByLabelText("Before the tag"), { target: { value: "12" } });
    expect(screen.getByText(/A save tagged at/)).toHaveTextContent("plays from 15:20 to 15:37 (17 seconds)");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ clip_pre_s: 12, clip_post_s: 5 });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("Save is disabled until something changes", async () => {
    api({ "/api/settings": { clip_pre_s: 8, clip_post_s: 5 } });
    renderWithProviders(<PlaybackSettings />);
    expect(await screen.findByRole("button", { name: "Save" })).toBeDisabled();
  });
});

const health = (over: Partial<StorageHealth> = {}): StorageHealth => ({
  folders: [
    { role: "archive", path: "/archive", exists: true, readable: true, writable: false, free_bytes: 23 * 2 ** 30,
      total_bytes: 926 * 2 ** 30, status: "error", messages: ["The app cannot write to the archive folder, so it cannot save matches."] },
    { role: "inbox", path: "/inbox", exists: true, readable: true, writable: false, free_bytes: 1, total_bytes: 2,
      status: "ok", messages: ["Everything looks fine."] },
  ],
  archive: { indexed_files: 2, indexed_bytes: 2 ** 30, missing: [{ media_id: 1, match_id: 7, opponent: "Rovers", match_date: "2026-10-18", relative_path: "FootballMemories/Matches/a.mp4" }] },
  ...over,
});

describe("StorageSettings", () => {
  it("shows a problem with the archive in plain words", async () => {
    api({ "/api/storage/health": health() });
    renderWithProviders(<StorageSettings />);
    const archive = await screen.findByRole("region", { name: "Archive folder" });
    expect(within(archive).getByText("Problem")).toBeInTheDocument();
    expect(within(archive).getByText(/cannot write to the archive folder/)).toBeInTheDocument();
    expect(within(archive).getByText("23.0 GB free")).toBeInTheDocument();
  });

  it("treats a read-only import folder as fine", async () => {
    api({ "/api/storage/health": health() });
    renderWithProviders(<StorageSettings />);
    const inbox = await screen.findByRole("region", { name: "Import folder" });
    expect(within(inbox).getByText("Healthy")).toBeInTheDocument();
    expect(within(inbox).getByText("Read-only is fine")).toBeInTheDocument();
  });

  it("lists missing videos with a link to their match", async () => {
    api({ "/api/storage/health": health() });
    renderWithProviders(<StorageSettings />);
    const contents = await screen.findByRole("region", { name: "Archive contents" });
    expect(within(contents).getByRole("link", { name: "vs Rovers" })).toHaveAttribute("href", "/matches/7");
    expect(within(contents).getByText("FootballMemories/Matches/a.mp4")).toBeInTheDocument();
  });
});
