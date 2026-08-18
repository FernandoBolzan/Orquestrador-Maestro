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
});
