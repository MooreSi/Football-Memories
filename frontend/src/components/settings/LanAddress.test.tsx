import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { LanAddress } from "./LanAddress";

// Owner request 2026-11-14: Connections shows the address to open on a phone or
// tablet on the same home network, read by the helper on this computer.
const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());

it("shows the computer's network name and address with the app's port", async () => {
  stubFetch({ [`${H}/network`]: { host: "MacMini.local", ip: "192.168.0.53" } });
  renderWithProviders(<LanAddress port="8765" />);
  const box = await screen.findByRole("region", { name: "On your home network" });
  expect(await within(box).findByText("http://MacMini.local:8765")).toBeInTheDocument();
  expect(within(box).getByText("http://192.168.0.53:8765")).toBeInTheDocument();
});

it("shows only the address when the computer has no network name", async () => {
  stubFetch({ [`${H}/network`]: { host: null, ip: "10.0.0.7" } });
  renderWithProviders(<LanAddress port="8765" />);
  expect(await screen.findByText("http://10.0.0.7:8765")).toBeInTheDocument();
  expect(screen.queryByText(/\.local/)).toBeNull();
});

it("says how to find it when the helper cannot tell", async () => {
  stubFetch({});
  renderWithProviders(<LanAddress port="8765" />);
  expect(await screen.findByText(/Start the desktop helper/)).toBeInTheDocument();
});
