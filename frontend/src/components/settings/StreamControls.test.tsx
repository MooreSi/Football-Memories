import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StreamPlayer } from "./HudlAccount";

it("shows playback controls only while the pointer is over the video", () => {
  render(<StreamPlayer url="http://127.0.0.1:8766/stream/x/playlist.m3u8" />);
  const video = screen.getByLabelText("Hudl match stream");
  expect(video).not.toHaveAttribute("controls");
  fireEvent.mouseEnter(video);
  expect(video).toHaveAttribute("controls");
  fireEvent.mouseLeave(video);
  expect(video).not.toHaveAttribute("controls");
});
