import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

afterEach(() => vi.unstubAllGlobals());

// Owner request 2026-11-26: Clips is not in the top bar; its content is reached from the Library.
it("leaves Clips out of the main navigation", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/"]}><AppShell /></MemoryRouter>
    </QueryClientProvider>,
  );
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(within(nav).queryByRole("link", { name: /Clips/ })).not.toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: /Library/ })).toBeInTheDocument(); // negative control
});

// Owner request 2026-11-27: Opponents sits in the top bar after Library, before Downloaded.
it("puts Opponents in the main navigation right after Library", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/"]}><AppShell /></MemoryRouter>
    </QueryClientProvider>,
  );
  const links = within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");
  const names = links.map(l => l.textContent);
  expect(names.slice(0, 3)).toEqual(["Library", "Opponents", "Downloaded"]);
  expect(links[1]).toHaveAttribute("href", "/opponents");
});
