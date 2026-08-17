"use strict";

const NORMAL_MODE = "NORMAL_MODE";
const TERMINAL_INPUT_MODE = "TERMINAL_INPUT_MODE";
const MODES = Object.freeze([NORMAL_MODE, TERMINAL_INPUT_MODE]);

function hitRegion(x, y, rect) {
  if (!rect || ![x, y, rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) throw new TypeError("coordinates and rect are required");
  if (y === rect.y && x >= rect.x && x < rect.x + rect.w) return "title";
  if (x === rect.x || x === rect.x + rect.w - 1 || y === rect.y + rect.h - 1) return "edge";
  return "content";
}

function baseState(state, patch = {}) {
  if (!MODES.includes(state?.mode)) throw new TypeError("state.mode must be NORMAL_MODE or TERMINAL_INPUT_MODE");
  return Object.freeze({
    mode: state.mode, rect: state.rect, dragStart: state.dragStart || null,
    suppressInput: false, toPty: false, ...patch
  });
}

function enterInput(state) { return baseState(state, { mode: TERMINAL_INPUT_MODE, dragStart: null }); }
function exitInput(state) { return baseState(state, { mode: NORMAL_MODE, dragStart: null }); }

function transition(event = {}, state = {}) {
  if (!MODES.includes(state.mode)) throw new TypeError("state.mode must be NORMAL_MODE or TERMINAL_INPUT_MODE");
  if (state.mode === TERMINAL_INPUT_MODE) {
    return baseState(state, { dragStart: null, toPty: ["down", "up", "drag"].includes(event.type) });
  }
  if (state.dragStart) {
    if (event.type === "dragEnd" || event.type === "up") return baseState(state, { dragStart: null, suppressInput: true });
    if (event.type === "drag") return baseState(state, { suppressInput: true });
  }
  if (event.type !== "down") return baseState(state, { dragStart: null });
  const region = hitRegion(event.x, event.y, state.rect);
  if (region === "content") return baseState(state, { dragStart: null });
  return baseState(state, {
    dragStart: Object.freeze({ axis: region === "title" ? "move" : "resize", x: event.x, y: event.y }),
    suppressInput: true
  });
}

module.exports = { MODES, NORMAL_MODE, TERMINAL_INPUT_MODE, enterInput, exitInput, hitRegion, transition };
