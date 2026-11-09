import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BackupInfo } from "../../api/types";
import { renderWithProviders } from "../../test/render";
import { ArchiveTools } from "./ArchiveTools";
import { BackupSettings } from "./BackupSettings";

afterEach(() => vi.unstubAllGlobals());

const backup: BackupInfo = {
  name: "backup-20261109-120000.json", kind: "manual", created_at: "2026-11-09T12:00:00+00:00",
  size_bytes: 20480, matches: 2, moments: 17,
};

type Handler = (method: string, url: string, init?: RequestInit) => unknown;
function mockApi(handler: Handler) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ method, url, body });
    const out = handler(method, url, init);
    return new Response(JSON.stringify(out ?? { detail: "unstubbed" }), { status: out === undefined ? 599 : 200, headers: { "Content-Type": "application/json" } });
  }));
  return calls;
}

describe("BackupSettings", () => {
  it("lists backups with their kind and contents", async () => {
    mockApi((_m, u) => (u === "/api/backups" ? [backup] : undefined));
    renderWithProviders(<BackupSettings />);
    const list = await screen.findByRole("region", { name: "Saved backups" });
    expect(await within(list).findByText("Manual")).toBeInTheDocument();
    expect(within(list).getByText(/2 matches · 17 moments/)).toBeInTheDocument();
    expect(within(list).getByRole("link", { name: /Download/ })).toHaveAttribute("href", "/api/backups/backup-20261109-120000.json");
  });

  it("restore stays locked until RESTORE is typed, then reports the safety backup", async () => {
    const calls = mockApi((m, u) => {
      if (u === "/api/backups") return [backup];
      if (m === "POST" && u.endsWith("/restore")) return { restored: backup.name, safety_backup: "pre-restore-20261109-130000.json" };
      return undefined;
    });
    renderWithProviders(<BackupSettings />);
    await userEvent.click(await screen.findByRole("button", { name: /^Restore$/ }));
    const go = screen.getByRole("button", { name: /Restore this backup/ });
    expect(go).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Type RESTORE to confirm"), "restore");
    expect(go).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("Type RESTORE to confirm"));
    await userEvent.type(screen.getByLabelText("Type RESTORE to confirm"), "RESTORE");
    await userEvent.click(go);
    expect(calls.find((c) => c.url.endsWith("/restore"))?.body).toEqual({ confirm: "RESTORE" });
    expect(await screen.findByText(/previous state was saved as pre-restore-20261109-130000.json/)).toBeInTheDocument();
  });

  it("explains that videos are not inside a backup", async () => {
    mockApi((_m, u) => (u === "/api/backups" ? [] : undefined));
    renderWithProviders(<BackupSettings />);
    expect(await screen.findByText(/Videos are not inside a backup file/)).toBeInTheDocument();
  });
});

describe("ArchiveTools", () => {
  it("runs a verification and summarises the result", async () => {
    let started = false;
    mockApi((m, u) => {
      if (u === "/api/storage/verify" && m === "POST") {
        started = true;
        return { state: "done", checked: 2, total: 2, started_at: null, finished_at: null,
          results: [{ media_id: 1, match_id: 7, opponent: "Rovers", result: "ok" },
                    { media_id: 2, match_id: 8, opponent: "City", result: "changed" }] };
      }
      if (u === "/api/storage/verify") return { state: started ? "done" : "idle", checked: 0, total: 0, started_at: null, finished_at: null, results: [] };
      return undefined;
    });
    renderWithProviders(<ArchiveTools />);
    await userEvent.click(await screen.findByRole("button", { name: "Verify all videos" }));
    expect(await screen.findByText(/2 of 2 checked · 1 need attention/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "vs City" })).toHaveAttribute("href", "/matches/8");
    expect(screen.getByText(/file has changed since import/)).toBeInTheDocument();
  });

  it("reports how many moved files were reconnected", async () => {
    mockApi((_m, u) => {
      if (u === "/api/storage/relink") return { relinked: 1, still_missing: 0 };
      if (u === "/api/storage/verify") return { state: "idle", checked: 0, total: 0, started_at: null, finished_at: null, results: [] };
      return undefined;
    });
    renderWithProviders(<ArchiveTools />);
    await userEvent.click(await screen.findByRole("button", { name: "Find moved files" }));
    expect(await screen.findByText("Reconnected 1; still missing 0.")).toBeInTheDocument();
  });
});
