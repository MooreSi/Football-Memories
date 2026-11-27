import { applyRay, panoramaRay } from "./atlasGeometry";
import { levelGround } from "./levelGround";
import { panoramaMatrixAt, type Panorama } from "./panorama";
import type { Corners } from "./pitch";

/** Fewest central feet before the share means anything. */
export const MIN_FEET = 200;
type Foot = { time_s: number; image_box?: number[]; central?: boolean };

/**
 * Share of players' feet that stand inside a pitch outline, measured on the level ground.
 *
 * Judge an outline here, never by atlas rows: a low Veo camera squeezes the far 20+ m into a thin
 * strip of the atlas, so play there looks like a sliver beside an empty pitch (261122 Bournville
 * Greens: the automatic outline held 98% of central feet, the accepted one far fewer). Only people
 * in the middle of the view count (`central`): Veo follows play, while spectators line the far fence.
 * Short outlines on earlier games held 23-37%, right ones 92-98%. Null when it cannot be judged.
 */
export function playShare(data: Panorama, outline: Corners, observations: Foot[]): number | null {
  const ground = levelGround(data);
  if (!ground || outline.length < 3) return null;
  const plan = (ray: number[]): [number, number] | null => {
    const d = ray[0] * ground.down[0] + ray[1] * ground.down[1] + ray[2] * ground.down[2];
    if (!(d > 1e-9)) return null;
    const dot = (a: number[]) => a[0] * ray[0] + a[1] * ray[1] + a[2] * ray[2];
    return [dot(ground.right) / d, dot(ground.forward) / d];
  };
  const polygon = outline.map(p => plan(panoramaRay(data, p)));
  if (polygon.some(p => !p)) return null;
  const poly = polygon as [number, number][];
  const inside = ([x, y]: [number, number]) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  let total = 0, held = 0;
  for (const o of observations) {
    if (!o.central || !o.image_box) continue;
    const matrix = panoramaMatrixAt(data, o.time_s);
    if (!matrix) continue;
    const [x1, , x2, y2] = o.image_box, p = plan(applyRay(matrix, [(x1 + x2) / 2, y2, 1]));
    if (!p) continue;
    total++;
    if (inside(p)) held++;
  }
  return total >= MIN_FEET ? held / total : null;
}
