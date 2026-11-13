/** Spec 230: positions on the shareable report card, so long names never run into
 *  each other (owner report 2026-11-13). Widths are estimates for the system sans
 *  font: wide enough on purpose, so a line is never longer than it is measured. */
import type { ReportLine } from "./report";

export const REPORT_WIDTH = 1080;
const MARGIN = 90;
const INNER = REPORT_WIDTH - MARGIN * 2;
const GAP = 40;
export const ROW_FONT = 34;
const VALUE_FONT = 36;
const LINE = 46;

export function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) units += /[A-Z0-9MW@%&]/.test(ch) ? 0.68 : /[ il.,'|:;!]/.test(ch) ? 0.3 : 0.56;
  return units * size;
}

export function wrapText(text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function fitTitle(title: string, max = 60, min = 28, width = INNER): number {
  let size = max;
  while (size > min && textWidth(title, size) > width) size -= 2;
  return size;
}

export type Row = { label: string; value: string[]; y: number; stacked: boolean };

/** Rows from `top`: label and value side by side when both fit, otherwise the value
 *  goes on its own lines under the label. */
export function layoutRows(lines: ReportLine[], top: number): (Row & { bottom: number })[] {
  let y = top;
  return lines.map((l) => {
    const inline = textWidth(l.label, ROW_FONT) + GAP + textWidth(l.value, VALUE_FONT) <= INNER;
    const value = inline ? [l.value] : wrapText(l.value, VALUE_FONT, INNER);
    const row = { label: l.label, value, y, stacked: !inline, bottom: 0 };
    y += inline ? 62 : LINE * (value.length + 1) + 16;
    row.bottom = y;
    return row;
  });
}

export const VALUE_LINE = LINE;
export const VALUE_SIZE = VALUE_FONT;
export const REPORT_MARGIN = MARGIN;
