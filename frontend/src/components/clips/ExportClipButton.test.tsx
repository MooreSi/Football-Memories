import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { ReelDetail } from "../../api/types";
import { renderWithProviders } from "../../test/render";
import { ExportClipButton } from "./ExportClipButton";

const moment = { event_id: 42, category: "Save", opponent: "Rovers", time_s: 64, offline: true };
afterEach(() => vi.restoreAllMocks());

describe("ExportClipButton", () => {
  it("renders exactly one moment without title cards and opens its download view", async () => {
    const create = vi.spyOn(api, "createReel").mockResolvedValue({ id: 9 } as ReelDetail);
    const render = vi.spyOn(api, "renderReel").mockResolvedValue({ id: 9, status: "queued" } as ReelDetail);
    renderWithProviders(<Routes>
      <Route path="/" element={<ExportClipButton moment={moment} />} />
      <Route path="/clips/reels/:id" element={<p>Clip download view</p>} />
    </Routes>);
    await userEvent.click(screen.getByRole("button", { name: "Export Save at 1:04" }));
    expect(await screen.findByText("Clip download view")).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({ name: "Save vs Rovers at 1:04", opening_title: null,
      closing_text: null, items: [{ event_id: 42, pre_s: null, post_s: null }] });
    expect(render).toHaveBeenCalledWith(9);
  });

  it("does not offer export when the local match is missing", () => {
    renderWithProviders(<ExportClipButton moment={{ ...moment, offline: false }} />);
    expect(screen.getByRole("button", { name: "Export Save at 1:04" })).toBeDisabled();
  });

  it("shows a render failure instead of claiming a download exists", async () => {
    vi.spyOn(api, "createReel").mockResolvedValue({ id: 9 } as ReelDetail);
    vi.spyOn(api, "renderReel").mockRejectedValue(new Error("Render queue unavailable"));
    renderWithProviders(<ExportClipButton moment={moment} />);
    await userEvent.click(screen.getByRole("button", { name: "Export Save at 1:04" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Render queue unavailable");
  });
});
