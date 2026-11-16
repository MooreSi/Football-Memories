import { afterEach, expect, it, vi } from "vitest";
import { crestBox, trimCrest } from "./crestTrim";

// Owner report 2026-11-15: crests looked small. A crest file often has a wide plain margin
// (and sometimes a faint watermark); the badge crops to the crest itself. Synthetic pixels.
type Paint = (x: number, y: number) => [number, number, number, number] | null;
function image(w: number, h: number, bg: [number, number, number, number], paint: Paint) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(paint(x, y) ?? bg, (y * w + x) * 4);
  return px;
}
const OFF_WHITE: [number, number, number, number] = [246, 245, 240, 255];
const disc = (cx: number, cy: number, r: number): Paint => (x, y) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? [20, 20, 20, 255] : null);

it("finds a round crest inside an off-white margin, ignoring a faint corner watermark", () => {
  const crest = disc(50, 55, 30);
  const px = image(100, 120, OFF_WHITE, (x, y) => crest(x, y) ?? (x >= 86 && x < 96 && y >= 112 && y < 115 && x % 2 ? [150, 150, 150, 255] : null));
  const box = crestBox(px, 100, 120)!;
  expect(box.round).toBe(true);
  expect(box.size).toBeGreaterThanOrEqual(60);
  expect(box.size).toBeLessThanOrEqual(64);
  expect(Math.abs(box.x + box.size / 2 - 50)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(box.y + box.size / 2 - 55)).toBeLessThanOrEqual(1.5);
});

it("finds a crest on a transparent background", () => {
  const box = crestBox(image(80, 80, [0, 0, 0, 0], disc(40, 40, 20)), 80, 80)!;
  expect(box.round).toBe(true);
  expect(box.size).toBeGreaterThanOrEqual(40);
  expect(box.size).toBeLessThanOrEqual(43);
});

it("calls a square or shield crest not round, so its corners are not cut off", () => {
  const square = image(100, 100, OFF_WHITE, (x, y) => (x >= 20 && x < 80 && y >= 20 && y < 80 ? [200, 30, 30, 255] : null));
  expect(crestBox(square, 100, 100)!.round).toBe(false);
  // A shield: straight top corners, narrowing to a point at the bottom.
  const shield = image(100, 100, [0, 0, 0, 0], (x, y) => (y >= 10 && y < 90 && Math.abs(x - 50) <= 35 * Math.min(1, (90 - y) / 40) ? [0, 80, 200, 255] : null));
  expect(crestBox(shield, 100, 100)!.round).toBe(false);
});

it("gives nothing for a blank image", () => {
  expect(crestBox(image(10, 10, OFF_WHITE, () => null), 10, 10)).toBeNull();
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Full check 2026-11-16: a crest slower than the 4 s limit showed uncropped, and that
// "no crop" answer was kept for the whole visit, so the crest never filled its badge
// even after it had loaded. A crest that loads late is cropped for the next badge.
it("crops a crest that loaded after the time limit for the badges that ask next", async () => {
  vi.useFakeTimers();
  const images: { onload: (() => void) | null; naturalWidth: number; naturalHeight: number }[] = [];
  vi.stubGlobal("Image", class { onload: (() => void) | null = null; onerror: (() => void) | null = null; naturalWidth = 40; naturalHeight = 40; src = "";
    constructor() { images.push(this); } });
  const pixels = image(40, 40, OFF_WHITE, disc(20, 20, 12));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
    ({ drawImage: () => undefined, getImageData: () => ({ data: pixels }) }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,CROPPED");
  const first = trimCrest("/api/team-logo?name=Slow%20Town");
  vi.advanceTimersByTime(4001);
  expect(await first).toBeNull(); // the badge does not wait
  images[0].onload?.();
  expect(await trimCrest("/api/team-logo?name=Slow%20Town")).toEqual({ url: "data:image/png;base64,CROPPED", round: true });
});
