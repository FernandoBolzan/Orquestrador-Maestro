"use strict";

export enum InputLayer {
  PTY_ATTACHED = "PTY_ATTACHED",
  CRITICAL_MODAL = "CRITICAL_MODAL",
  OVERLAY_PALETTE = "OVERLAY_PALETTE",
  /** Ponto de extensão planejado: switcher de projetos em overlay modal. */
  OVERLAY_SWITCHER = "OVERLAY_SWITCHER",
  TEXT_INPUT = "TEXT_INPUT",
  WINDOW_CONTENT = "WINDOW_CONTENT",
  WORKSPACE = "WORKSPACE",
  GLOBAL = "GLOBAL"
}

export interface NormalizedKeyEvent {
  name: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  sequence?: string;
  raw?: string;
  chord: string;
}

export interface ResolvedKeyAction {
  type: string;
  target?: string;
  data?: any;
  consumed: boolean;
}

export function normalizeKeyEvent(key: any = {}): NormalizedKeyEvent {
  const name = String(key.name || "").toLowerCase();
  const ctrl = Boolean(key.ctrl);
  const alt = Boolean(key.meta || key.alt);
  const shift = Boolean(key.shift);
  const sequence = typeof key.sequence === "string" ? key.sequence : undefined;
  const raw = typeof key.raw === "string" ? key.raw : undefined;

  let chord = name;
  if (name === "escape") chord = "Esc";
  else if (name === "return" || name === "enter") chord = "Enter";
  else if (name === "tab") chord = shift ? "Shift+Tab" : "Tab";
  else if (name === "space") chord = "Space";
  else if (name === "up" || name === "down" || name === "left" || name === "right") {
    chord = name.charAt(0).toUpperCase() + name.slice(1);
  } else if (ctrl && name) {
    chord = `Ctrl+${name.toUpperCase()}`;
  } else if (alt && name) {
    chord = `Alt+${name.toUpperCase()}`;
  } else if (name.length === 1) {
    chord = shift ? name.toUpperCase() : name;
  }

  return { name, ctrl, alt, shift, sequence, raw, chord };
}

export class InputContextStack {
  private stack: InputLayer[] = [InputLayer.GLOBAL];

  push(layer: InputLayer): void {
    this.stack.push(layer);
  }

  pop(): InputLayer | undefined {
    if (this.stack.length > 1) {
      return this.stack.pop();
    }
    return this.stack[0];
  }

  currentLayer(): InputLayer {
    return this.stack[this.stack.length - 1] || InputLayer.GLOBAL;
  }

  contains(layer: InputLayer): boolean {
    return this.stack.includes(layer);
  }

  reset(layers: InputLayer[] = [InputLayer.GLOBAL]): void {
    this.stack = layers.length > 0 ? [...layers] : [InputLayer.GLOBAL];
  }
}

export function resolveKeyAction(
  key: NormalizedKeyEvent,
  stack: InputContextStack
): ResolvedKeyAction {
  const layer = stack.currentLayer();

  // 1. PTY_ATTACHED has absolute highest priority:
  if (layer === InputLayer.PTY_ATTACHED) {
    // Only Ctrl+] / \x1d breaks out of PTY
    if (key.ctrl && (key.name === "]" || key.sequence === "\x1d")) {
      return { type: "pty.detach", consumed: true };
    }
    // All other keys go directly into PTY stream
    let data: string | null = null;
    if (key.ctrl && /^[a-z]$/u.test(key.name)) {
      data = String.fromCharCode(key.name.charCodeAt(0) - 96);
    } else {
      const controlMap: Record<string, string> = {
        return: "\r", enter: "\r", backspace: "\x7f", tab: "\t", escape: "\x1b", space: " ",
        up: "\x1b[A", down: "\x1b[B", right: "\x1b[C", left: "\x1b[D",
        home: "\x1b[H", end: "\x1b[F", delete: "\x1b[3~", insert: "\x1b[2~",
        pageup: "\x1b[5~", pagedown: "\x1b[6~"
      };
      if (Object.hasOwn(controlMap, key.name)) {
        data = controlMap[key.name];
      } else if (key.sequence) {
        data = key.sequence;
      } else if (key.raw) {
        data = key.raw;
      } else if (key.name && key.name.length === 1) {
        data = key.name;
      }
    }
    return { type: "pty.input", data, consumed: true };
  }

  // 2. CRITICAL_MODAL
  if (layer === InputLayer.CRITICAL_MODAL) {
    if (key.chord === "Esc") {
      return { type: "modal.escape", consumed: true };
    }
    if (["3", "4", "s", "S"].includes(key.name)) {
      return { type: "modal.action", data: key.name.toLowerCase(), consumed: true };
    }
    return { type: "modal.ignore", consumed: true };
  }

  // 3. OVERLAYS (Command Palette / Project Switcher)
  if (layer === InputLayer.OVERLAY_PALETTE || layer === InputLayer.OVERLAY_SWITCHER) {
    if (key.chord === "Esc") {
      return { type: "overlay.close", consumed: true };
    }
    if (key.chord === "Enter") {
      return { type: "overlay.select", consumed: true };
    }
    if (key.name === "up" || key.name === "down") {
      return { type: "overlay.navigate", data: key.name, consumed: true };
    }
    return { type: "overlay.input", data: key.sequence || key.raw || key.name, consumed: true };
  }

  // 4. TEXT_INPUT
  if (layer === InputLayer.TEXT_INPUT) {
    if (key.chord === "Esc") {
      return { type: "input.cancel", consumed: true };
    }
    if (key.chord === "Enter") {
      return { type: "input.submit", consumed: true };
    }
    return { type: "input.character", data: key.sequence || key.raw || key.name, consumed: true };
  }

  // 5. GLOBAL & WORKSPACE SHORTCUTS
  if (key.ctrl && key.name === "k") {
    return { type: "command.palette", consumed: true };
  }
  if (key.ctrl && key.name === "p") {
    return { type: "project.switcher", consumed: true };
  }
  if (key.name === "?" || key.sequence === "?") {
    return { type: "help.contextual", consumed: true };
  }
  if (key.name === "tab") {
    return { type: key.shift ? "focus.previous" : "focus.next", consumed: true };
  }
  if (key.chord === "Esc") {
    return { type: "workspace.escape", consumed: true };
  }

  // Workspace actions when not typing:
  if (layer === InputLayer.WORKSPACE || layer === InputLayer.GLOBAL) {
    if (key.name === "q" || key.name === "Q") {
      return { type: "system.quit", consumed: true };
    }
    if (key.name === "t" || key.name === "T") {
      return { type: "workspace.terminal", consumed: true };
    }
    if (key.name === "s" || key.name === "S") {
      return { type: "workspace.skills", consumed: true };
    }
    if (key.name === "a" || key.name === "A") {
      return { type: "workspace.attention", consumed: true };
    }
    if (key.name === "m" || key.name === "M") {
      return { type: "workspace.mission", consumed: true };
    }
    if (key.name === "r" || key.name === "R") {
      return { type: "workspace.run_mission", consumed: true };
    }
    if (key.ctrl && key.name === "f") {
      return { type: "workspace.maximize", consumed: true };
    }
    if (/^[1-9]$/u.test(key.name)) {
      return { type: "workspace.slot", data: Number(key.name), consumed: true };
    }
    if (["up", "down", "left", "right", "j", "k", "h", "l"].includes(key.name)) {
      return { type: "workspace.navigate", data: key.name, consumed: true };
    }
    if (key.chord === "Enter") {
      return { type: "workspace.activate", consumed: true };
    }
  }

  return { type: "noop", consumed: false };
}
