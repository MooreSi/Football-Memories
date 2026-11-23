import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";

it("keeps an editing popup open when a text-selection drag ends on the backdrop", () => {
  const close=vi.fn();
  render(<Overlay label="Rename tournament" onClose={close}><input aria-label="Tournament name" defaultValue="Match day" /></Overlay>);
  const input=screen.getByLabelText("Tournament name");
  const backdrop=screen.getByRole("dialog").parentElement!;
  fireEvent.pointerDown(input);
  fireEvent.pointerUp(backdrop);
  fireEvent.click(backdrop);
  expect(close).not.toHaveBeenCalled();
});

it("dismisses on a deliberate backdrop click but not an input click", () => {
  const close=vi.fn();
  render(<Overlay label="Rename tournament" onClose={close}><input aria-label="Tournament name" /></Overlay>);
  const backdrop=screen.getByRole("dialog").parentElement!;
  fireEvent.pointerDown(screen.getByLabelText("Tournament name"));
  fireEvent.click(screen.getByLabelText("Tournament name"));
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(backdrop);
  fireEvent.pointerUp(backdrop);
  fireEvent.click(backdrop);
  expect(close).toHaveBeenCalledTimes(1);
});
