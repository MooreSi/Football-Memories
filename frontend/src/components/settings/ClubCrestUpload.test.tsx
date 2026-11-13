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
