import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { HomeTeamField } from "./HomeTeamField";

afterEach(() => vi.unstubAllGlobals());

it("saves the team name for one source only", async () => {
  stubFetch({ "/api/settings/home-teams": { hudl: "Aston Example", veo: null } });
  const user = userEvent.setup();
  renderWithProviders(<HomeTeamField source="veo" />);
  const field = await screen.findByLabelText("Your team on Veo");
  expect(field).toHaveValue("");
  await user.type(field, "Riverside Juniors");
  await user.click(screen.getByRole("button", { name: "Save team name" }));
  const put = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PUT");
  expect(put?.[0]).toBe("/api/settings/home-teams");
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({ veo: "Riverside Juniors" });
});

it("shows the saved Hudl name", async () => {
  stubFetch({ "/api/settings/home-teams": { hudl: "Aston Example", veo: null } });
  renderWithProviders(<HomeTeamField source="hudl" />);
  expect(await screen.findByDisplayValue("Aston Example")).toBe(screen.getByLabelText("Your team on Hudl"));
});
