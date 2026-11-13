import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { ClubCrestUpload } from "./ClubCrestUpload";

// Owner request 2026-11-13: grassroots clubs are rarely on Wikipedia, so the owner adds crests.
afterEach(() => vi.unstubAllGlobals());

it("uploads a crest image for the named club", async () => {
  stubFetch({ "/api/team-logo": { saved: "Northgate CB" } });
  const user = userEvent.setup();
  renderWithProviders(<ClubCrestUpload />);
  await user.type(screen.getByLabelText("Club name"), "Northgate CB");
  await user.upload(screen.getByLabelText("Crest image"), new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "crest.png", { type: "image/png" }));
  await user.click(screen.getByRole("button", { name: "Save crest" }));
  const post = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
  expect(post?.[0]).toBe("/api/team-logo");
  const form = post?.[1]?.body as FormData;
  expect(form.get("name")).toBe("Northgate CB");
  expect((form.get("file") as File).name).toBe("crest.png");
  expect(await screen.findByRole("status")).toHaveTextContent("Crest saved for Northgate CB");
});

it("needs a name and an image before saving", () => {
  stubFetch({});
  renderWithProviders(<ClubCrestUpload />);
  expect(screen.getByRole("button", { name: "Save crest" })).toBeDisabled();
});

// Owner request 2026-11-13: finding a grassroots crest should be quick. The app cannot
// search Google itself (its terms forbid it), so it opens the search and takes a paste.
it("opens an image search for the club and its sides' common name", async () => {
  stubFetch({});
  const user = userEvent.setup();
  renderWithProviders(<ClubCrestUpload />);
  expect(screen.queryByRole("link", { name: /Find the crest on the web/ })).toBeNull();
  await user.type(screen.getByLabelText("Club name"), "Norton Lindsay CB");
  const link = screen.getByRole("link", { name: /Find the crest on the web/ });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  const url = new URL(link.getAttribute("href")!);
  expect(url.origin + url.pathname).toBe("https://www.google.com/search");
  expect(url.searchParams.get("q")).toBe("Norton Lindsay FC crest");
  expect(url.searchParams.get("udm")).toBe("2"); // Images
});

it("takes a crest pasted from the clipboard", async () => {
  stubFetch({ "/api/team-logo": { saved: "Norton Lindsay" } });
  const user = userEvent.setup();
  renderWithProviders(<ClubCrestUpload />);
  await user.type(screen.getByLabelText("Club name"), "Norton Lindsay");
  const image = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", { type: "image/png" });
  const zone = screen.getByRole("button", { name: /Paste or drop the crest here/ });
  zone.focus();
  await user.paste({ files: [image], items: [{ kind: "file", type: "image/png", getAsFile: () => image }] } as unknown as DataTransfer);
  expect(await screen.findByText(/image\.png ready/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save crest" }));
  const post = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
  expect(((post?.[1]?.body as FormData).get("file") as File).name).toBe("image.png");
});
