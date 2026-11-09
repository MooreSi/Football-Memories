import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { ConnectionsPage } from "./ConnectionsPage";

afterEach(() => vi.unstubAllGlobals());

describe("ConnectionsPage", () => {
  it("opens fresh Hudl sign-in without collecting app credentials", async () => {
    stubFetch({ "/api/connectors": [{
      id: "hudl", name: "Hudl", available: false, reason: "Desktop capture helper",
      docs: "HUDL_INTEGRATION.md", limitations: [], capabilities: {},
    }] });
    renderWithProviders(<ConnectionsPage />);
    const login = await screen.findByRole("link", { name: "Sign in on Hudl" });
    expect(login).toHaveAttribute("href", "https://www.hudl.com/login");
    expect(login).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.getByText(/does not connect this app/i)).toBeInTheDocument();
  });

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
