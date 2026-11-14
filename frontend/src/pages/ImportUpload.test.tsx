import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { ImportPage } from "./ImportPage";

// Owner request 2026-11-14: when the import folder is empty, a video can be dropped on
// the box or chosen with a button; it is saved into the import folder, then selected.
const upload = vi.hoisted(() => ({ uploadVideo: vi.fn() }));
vi.mock("../api/upload", () => upload);
afterEach(() => { vi.unstubAllGlobals(); upload.uploadVideo.mockReset(); });

const saved = { filename: "uploaded/U12 v Rovers.mp4", size_bytes: 5000, has_tags: false };

function render(inbox: object[] = []) {
  stubFetch({ "/api/imports/inbox": inbox, "/api/teams": [] });
  renderWithProviders(<ImportPage />);
}

it("uploads a chosen video, then lists and selects it", async () => {
  render();
  upload.uploadVideo.mockImplementation(async (_file: File, progress: (f: number) => void) => {
    progress(0.5);
    stubFetch({ "/api/imports/inbox": [saved], "/api/teams": [] });
    return saved;
  });
  const input = await screen.findByLabelText("Choose a video file");
  const file = new File(["video"], "U12 v Rovers.mp4", { type: "video/mp4" });
  await userEvent.setup().upload(input, file);
  expect(upload.uploadVideo).toHaveBeenCalledWith(file, expect.any(Function));
  const choice = await screen.findByRole("radio", { name: /U12 v Rovers\.mp4/ });
  await vi.waitFor(() => expect(choice).toBeChecked());
  expect(screen.getByRole("button", { name: "Import match" })).toBeEnabled();
});

it("takes a video dropped on the box", async () => {
  render();
  upload.uploadVideo.mockResolvedValue(saved);
  const zone = await screen.findByRole("button", { name: /Drop a match video here/ });
  const file = new File(["video"], "Drop.mov", { type: "video/quicktime" });
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
  await vi.waitFor(() => expect(upload.uploadVideo).toHaveBeenCalledWith(file, expect.any(Function)));
});

it("refuses a file that is not a video without sending it", async () => {
  render();
  const zone = await screen.findByRole("button", { name: /Drop a match video here/ });
  fireEvent.drop(zone, { dataTransfer: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
  expect(await screen.findByRole("alert")).toHaveTextContent(/video file/);
  expect(upload.uploadVideo).not.toHaveBeenCalled();
});

it("says why an upload failed", async () => {
  render();
  upload.uploadVideo.mockRejectedValue(new Error("The video could not be saved (the disk may be full). Nothing was kept."));
  await userEvent.setup().upload(await screen.findByLabelText("Choose a video file"), new File(["v"], "a.mp4", { type: "video/mp4" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/disk may be full/);
});

it("keeps the add-a-video box when the folder already has files", async () => {
  render([{ filename: "Old v Town.mp4", size_bytes: 10, has_tags: false }]);
  expect(await screen.findByRole("radio", { name: /Old v Town/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Drop a match video here/ })).toBeInTheDocument();
});
