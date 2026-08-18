import { describe, it, expect } from "bun:test";
import {
  InputContextStack,
  InputLayer,
  normalizeKeyEvent,
  resolveKeyAction
} from "../input/input-pipeline";

describe("Canonical Input Pipeline & Context Stack", () => {
  it("normalizes key events deterministically", () => {
    const rawCtrlK = { name: "k", ctrl: true, sequence: "\x0b" };
    const norm = normalizeKeyEvent(rawCtrlK);
    expect(norm.name).toBe("k");
    expect(norm.ctrl).toBe(true);
    expect(norm.chord).toBe("Ctrl+K");

    const rawEsc = { name: "escape", sequence: "\x1b" };
    expect(normalizeKeyEvent(rawEsc).chord).toBe("Esc");

    const rawEnter = { name: "return", sequence: "\r" };
    expect(normalizeKeyEvent(rawEnter).chord).toBe("Enter");

    const rawCtrlBracket = { name: "]", ctrl: true, sequence: "\x1d" };
    expect(normalizeKeyEvent(rawCtrlBracket).chord).toBe("Ctrl+]");
  });

  it("prioritizes PTY_ATTACHED over all global shortcuts", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.PTY_ATTACHED);

    expect(stack.currentLayer()).toBe(InputLayer.PTY_ATTACHED);

    // Any normal key in PTY_ATTACHED must NOT trigger global actions
    const keyQ = normalizeKeyEvent({ name: "q" });
    const actionQ = resolveKeyAction(keyQ, stack);
    expect(actionQ.type).toBe("pty.input");
    expect(actionQ.data).toBe("q");

    // Ctrl+K in PTY_ATTACHED must go to PTY, NOT open palette
    const keyCtrlK = normalizeKeyEvent({ name: "k", ctrl: true });
    const actionCtrlK = resolveKeyAction(keyCtrlK, stack);
    expect(actionCtrlK.type).toBe("pty.input");
    expect(actionCtrlK.data).toBe("\x0b");

    // Only Ctrl+] in PTY_ATTACHED triggers detach
    const keyDetach = normalizeKeyEvent({ name: "]", ctrl: true });
    const actionDetach = resolveKeyAction(keyDetach, stack);
    expect(actionDetach.type).toBe("pty.detach");
  });

  it("enforces MODAL containment blocking lower layers", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.CRITICAL_MODAL);

    expect(stack.currentLayer()).toBe(InputLayer.CRITICAL_MODAL);

    // In modal, 'q' does not quit TUI
    const keyQ = normalizeKeyEvent({ name: "q" });
    const actionQ = resolveKeyAction(keyQ, stack);
    expect(actionQ.type).toBe("modal.ignore");

    // Esc closes modal
    const keyEsc = normalizeKeyEvent({ name: "escape" });
    const actionEsc = resolveKeyAction(keyEsc, stack);
    expect(actionEsc.type).toBe("modal.escape");

    // Quick decisions 3/4/s work in modal
    expect(resolveKeyAction(normalizeKeyEvent({ name: "3" }), stack).type).toBe("modal.action");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "4" }), stack).type).toBe("modal.action");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "s" }), stack).type).toBe("modal.action");
  });

  it("routes global shortcuts when in WORKSPACE or GLOBAL layer", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);

    const keyCtrlK = normalizeKeyEvent({ name: "k", ctrl: true });
    expect(resolveKeyAction(keyCtrlK, stack).type).toBe("command.palette");

    const keyCtrlP = normalizeKeyEvent({ name: "p", ctrl: true });
    expect(resolveKeyAction(keyCtrlP, stack).type).toBe("project.switcher");

    const keyHelp = normalizeKeyEvent({ name: "?", sequence: "?" });
    expect(resolveKeyAction(keyHelp, stack).type).toBe("help.contextual");
  });

  it("handles escape ladder safely without accidental quit", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.OVERLAY_PALETTE);

    // 1. In palette overlay -> Esc closes overlay
    expect(resolveKeyAction(normalizeKeyEvent({ name: "escape" }), stack).type).toBe("overlay.close");
    stack.pop();

    // 2. In workspace -> Esc returns to cockpit
    expect(resolveKeyAction(normalizeKeyEvent({ name: "escape" }), stack).type).toBe("workspace.escape");
    stack.pop();

    // 3. At Cockpit root -> 'q' is available for quit
    expect(resolveKeyAction(normalizeKeyEvent({ name: "q" }), stack).type).toBe("system.quit");
  });

  it("routes OVERLAY_PALETTE actions: navigate, select, input, close", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.OVERLAY_PALETTE);

    expect(resolveKeyAction(normalizeKeyEvent({ name: "down" }), stack).type).toBe("overlay.navigate");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "up" }), stack).type).toBe("overlay.navigate");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "return" }), stack).type).toBe("overlay.select");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "escape" }), stack).type).toBe("overlay.close");

    const typeKey = resolveKeyAction(normalizeKeyEvent({ name: "r", sequence: "r" }), stack);
    expect(typeKey.type).toBe("overlay.input");
    expect(typeKey.data).toBe("r");
  });

  it("routes OVERLAY_SWITCHER actions identically to palette", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.OVERLAY_SWITCHER);

    expect(resolveKeyAction(normalizeKeyEvent({ name: "down" }), stack).type).toBe("overlay.navigate");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "return" }), stack).type).toBe("overlay.select");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "escape" }), stack).type).toBe("overlay.close");
  });

  it("routes TEXT_INPUT layer: submit, cancel, and character input", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    stack.push(InputLayer.TEXT_INPUT);

    expect(resolveKeyAction(normalizeKeyEvent({ name: "return" }), stack).type).toBe("input.submit");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "escape" }), stack).type).toBe("input.cancel");

    const charKey = resolveKeyAction(normalizeKeyEvent({ name: "m", sequence: "m" }), stack);
    expect(charKey.type).toBe("input.character");
    expect(charKey.data).toBe("m");
  });

  it("routes workspace actions: terminal, skills, attention, mission, run_mission", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);

    expect(resolveKeyAction(normalizeKeyEvent({ name: "t" }), stack).type).toBe("workspace.terminal");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "s" }), stack).type).toBe("workspace.skills");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "a" }), stack).type).toBe("workspace.attention");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "m" }), stack).type).toBe("workspace.mission");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "r" }), stack).type).toBe("workspace.run_mission");
  });

  it("routes workspace maximize via Ctrl+F", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);

    expect(resolveKeyAction(normalizeKeyEvent({ name: "f", ctrl: true }), stack).type).toBe("workspace.maximize");
  });

  it("routes workspace navigation: arrows, j/k/h/l, slots, activate", () => {
    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);

    for (const key of ["up", "down", "left", "right", "j", "k", "h", "l"]) {
      expect(resolveKeyAction(normalizeKeyEvent({ name: key }), stack).type).toBe("workspace.navigate");
    }

    for (const slot of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      const action = resolveKeyAction(normalizeKeyEvent({ name: slot }), stack);
      expect(action.type).toBe("workspace.slot");
      expect(action.data).toBe(Number(slot));
    }

    expect(resolveKeyAction(normalizeKeyEvent({ name: "return" }), stack).type).toBe("workspace.activate");
  });

  it("normalizes Tab and Shift+Tab chords", () => {
    expect(normalizeKeyEvent({ name: "tab" }).chord).toBe("Tab");
    expect(normalizeKeyEvent({ name: "tab", shift: true }).chord).toBe("Shift+Tab");

    const stack = new InputContextStack();
    stack.push(InputLayer.GLOBAL);
    stack.push(InputLayer.WORKSPACE);
    expect(resolveKeyAction(normalizeKeyEvent({ name: "tab" }), stack).type).toBe("focus.next");
    expect(resolveKeyAction(normalizeKeyEvent({ name: "tab", shift: true }), stack).type).toBe("focus.previous");
  });
});
