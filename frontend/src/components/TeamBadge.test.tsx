import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamBadge, initials } from "./TeamBadge";

describe("initials", () => {
  it("skips age-group words, so 'Riverside U12' becomes R", () => expect(initials("Riverside U12")).toBe("R"));
  it("takes the first letters of the first two words", () => expect(initials("Rovers Athletic FC")).toBe("RA"));
  it("ignores punctuation", () => expect(initials("St. Mary's")).toBe("SM"));
});

describe("TeamBadge crest request", () => {
  const src = (name: string) => {
    const { container, unmount } = render(<TeamBadge name={name} />);
    const url = container.querySelector("img")?.getAttribute("src") ?? null;
    unmount();
    return url;
  };
  it("asks for the full club behind a nickname or short form", () => {
    expect(src("The Hammers")).toBe("/api/team-logo?name=West%20Ham%20United");
    expect(src("Bluebirds")).toBe("/api/team-logo?name=Cardiff%20City");
    expect(src("Chelsea")).toBe("/api/team-logo?name=Chelsea");
  });
  it("shows initials without a request for a placeholder side", () => {
    expect(src("Home")).toBeNull();
    expect(src("Opposition")).toBeNull();
  });
});

it("tries the crest again later when the crest source was busy", () => {
  vi.useFakeTimers();
  try {
    const { container } = render(<TeamBadge name="Chelsea" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("C");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/team-logo?name=Chelsea&try=1");
    fireEvent.error(container.querySelector("img")!);
    act(() => { vi.advanceTimersByTime(90_000); });
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/team-logo?name=Chelsea&try=2");
    fireEvent.error(container.querySelector("img")!);
    act(() => { vi.advanceTimersByTime(600_000); });
    expect(container.querySelector("img")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
