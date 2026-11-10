import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithProviders } from "../test/render";
import { Brand } from "./BrandMark";

it("shows the crest logo and the two-line wordmark as one home link", () => {
  renderWithProviders(<Brand />);
  const link = screen.getByRole("link", { name: "Football Memories home" });
  expect(link).toHaveAttribute("href", "/");
  expect(link.querySelector("svg[data-logo='crest']")).not.toBeNull();
  expect(link).toHaveTextContent("Football");
  expect(link).toHaveTextContent("Memories");
});
