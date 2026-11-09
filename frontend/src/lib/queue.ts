/** Move one item to a new index. Out-of-range targets leave the list unchanged. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return [...list];
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/** Remove the item at `index` and keep `current` pointing at the same clip where possible. */
export function removeAt<T>(list: T[], index: number, current: number): { items: T[]; current: number } {
  const items = list.filter((_, i) => i !== index);
  let next = current;
  if (index < current) next = current - 1;
  if (next >= items.length) next = Math.max(0, items.length - 1);
  return { items, current: next };
}
