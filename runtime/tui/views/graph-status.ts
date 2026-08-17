const UNICODE: Readonly<Record<string, string>> = Object.freeze({ running: "● running", ready: "○ ready", done: "✓ done", completed: "✓ done", attention: "⚠ attention", failed: "✕ failed", blocked: "⊘ blocked", verifying: "◐ verifying", retrying: "↻ retrying" });
const ASCII: Readonly<Record<string, string>> = Object.freeze({ running: "o running", ready: ". ready", done: "ok done", completed: "ok done", attention: "! attention", failed: "x failed", blocked: "X blocked", verifying: "v verifying", retrying: "r retrying" });
export function statusGlyph(status: string, ascii = false): string { return (ascii ? ASCII : UNICODE)[status] || (ascii ? `? ${status}` : `◇ ${status}`); }

