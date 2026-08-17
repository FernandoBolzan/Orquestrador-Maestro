"use strict";

const MODES = Object.freeze(["single", "h-split", "v-split", "2x2", "focus"]);

function partitions(total, count) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function linearRects(indexes, columns, rows, horizontal) {
  const sizes = partitions(horizontal ? columns : rows, indexes.length);
  let offset = 0;
  return indexes.map((index, position) => {
    const rect = horizontal
      ? { x: offset, y: 0, w: sizes[position], h: rows, index }
      : { x: 0, y: offset, w: columns, h: sizes[position], index };
    offset += sizes[position];
    return rect;
  });
}

function gridRects(indexes, columns, rows) {
  const widths = partitions(columns, 2);
  const heights = partitions(rows, 2);
  return indexes.map((index, position) => ({
    x: position % 2 === 0 ? 0 : widths[0], y: position < 2 ? 0 : heights[0],
    w: widths[position % 2], h: heights[position < 2 ? 0 : 1], index
  }));
}

function focusRects(indexes, columns, rows, focusIndex) {
  const secondary = indexes.filter((index) => index !== focusIndex);
  if (secondary.length === 0) return [{ x: 0, y: 0, w: columns, h: rows, index: focusIndex }];
  const primaryWidth = Math.max(1, Math.floor(columns * 2 / 3));
  const heights = partitions(rows, secondary.length);
  let y = 0;
  return [
    { x: 0, y: 0, w: primaryWidth, h: rows, index: focusIndex },
    ...secondary.map((index, position) => {
      const rect = { x: primaryWidth, y, w: columns - primaryWidth, h: heights[position], index };
      y += heights[position]; return rect;
    })
  ];
}

/**
 * @param {{count:number, columns:number, rows:number, mode:string, fullscreen?:boolean, focusIndex?:number}} options
 */
function projectTerminals({ count, columns, rows, mode, fullscreen = false, focusIndex = 0 }) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError("count must be a positive integer");
  if (!Number.isInteger(columns) || columns < 1 || !Number.isInteger(rows) || rows < 1) throw new TypeError("columns and rows must be positive integers");
  if (!MODES.includes(mode)) throw new TypeError(`unknown terminal layout mode: ${mode}`);
  const focus = Math.min(Math.max(Number.isInteger(focusIndex) ? focusIndex : 0, 0), count - 1);
  const layoutTree = Object.freeze([Object.freeze({ mode })]);
  if (fullscreen || mode === "single") return Object.freeze({ rects: Object.freeze([Object.freeze({ x: 0, y: 0, w: columns, h: rows, index: focus })]), focus, layoutTree });

  const capacity = mode === "2x2" ? 4 : count;
  const pageStart = Math.floor(focus / capacity) * capacity;
  const indexes = Array.from({ length: Math.min(capacity, count - pageStart) }, (_, index) => pageStart + index);
  let rects;
  if (mode === "h-split") rects = linearRects(indexes, columns, rows, true);
  else if (mode === "v-split") rects = linearRects(indexes, columns, rows, false);
  else if (mode === "2x2") rects = gridRects(indexes, columns, rows);
  else rects = focusRects(indexes, columns, rows, focus);
  return Object.freeze({ rects: Object.freeze(rects.map(Object.freeze)), focus, layoutTree });
}

module.exports = { MODES, projectTerminals };
