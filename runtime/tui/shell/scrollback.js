"use strict";

const DEFAULT_SCROLLBACK = 5_000;
const SCROLLBACK_CAP = 10_000;

function frozenResult(indexes, pointer) {
  return Object.freeze({ indexes: Object.freeze([...indexes]), current: indexes[pointer] });
}

class ScrollbackRing {
  constructor({ capacity = DEFAULT_SCROLLBACK } = {}) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new TypeError("capacity must be a positive integer");
    this.capacity = Math.min(capacity, SCROLLBACK_CAP);
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
    this.searchState = null;
  }

  get length() { return this.size; }

  append(chunk) {
    if (!chunk || typeof chunk.data !== "string") throw new TypeError("chunk.data must be a string");
    const values = chunk.data.split(/\r?\n/u);
    if (values.at(-1) === "") values.pop();
    for (const line of values) this._push(line);
    this.searchState = null;
    return this.length;
  }

  _push(line) {
    if (this.size < this.capacity) {
      this.buffer[(this.head + this.size) % this.capacity] = line;
      this.size += 1;
      return;
    }
    this.buffer[this.head] = line;
    this.head = (this.head + 1) % this.capacity;
  }

  dropOldest(count = 1) {
    if (!Number.isInteger(count) || count < 0) throw new TypeError("count must be a non-negative integer");
    const dropped = Math.min(count, this.size);
    this.head = (this.head + dropped) % this.capacity;
    this.size -= dropped;
    this.searchState = null;
    return dropped;
  }

  lines() {
    return Object.freeze(Array.from({ length: this.size }, (_, index) => this.buffer[(this.head + index) % this.capacity]));
  }

  search(query) {
    if (query === undefined || query === null || String(query).trim() === "") return null;
    const normalized = String(query).toLocaleLowerCase();
    const indexes = [];
    for (const [index, line] of this.lines().entries()) if (line.toLocaleLowerCase().includes(normalized)) indexes.push(index);
    if (indexes.length === 0) { this.searchState = null; return null; }
    this.searchState = { query: normalized, indexes, pointer: 0 };
    return frozenResult(indexes, 0);
  }

  closeSearch() { this.searchState = null; }

  nextMatch() { return this._move(1); }
  previousMatch() { return this._move(-1); }

  _move(delta) {
    if (!this.searchState) return null;
    const { indexes } = this.searchState;
    this.searchState.pointer = (this.searchState.pointer + delta + indexes.length) % indexes.length;
    return frozenResult(indexes, this.searchState.pointer);
  }
}

module.exports = { DEFAULT_SCROLLBACK, SCROLLBACK_CAP, ScrollbackRing };
