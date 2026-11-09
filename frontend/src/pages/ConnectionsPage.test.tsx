import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { ConnectionsPage } from "./ConnectionsPage";

afterEach(() => vi.unstubAllGlobals());

describe("ConnectionsPage", () => {
  it("explains why Hudl is unavailable and offers no dead connect button", async () => {
    stubFetch({
      "/api/connectors": [
        {
          id: "hudl", name: "Hudl", available: false,
          reason: "Hudl's Terms of Service prohibit automated access.",
          docs: "HUDL_INTEGRATION.md", limitations: [],
          capabilities: { list_matches: false, import_files: false },
        },
        {
          id: "local_import", name: "Import from folder", available: true, reason: "",
          docs: "", limitations: [], capabilities: { list_matches: false, import_files: true },
        },
      ],
    });
    renderWithProviders(<ConnectionsPage />);
    expect(await screen.findByText(/Terms of Service prohibit/)).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect/i })).toBeNull();
  });
});
