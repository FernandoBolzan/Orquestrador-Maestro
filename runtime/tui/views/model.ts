export type Row = Readonly<{ id: string; fields: readonly unknown[]; [key: string]: unknown }>;
export type Section = Readonly<{ id: string; title: string; rows: readonly Row[] }>;
export type ViewState<T> = Readonly<{ data: T; selected?: string; empty?: boolean }>;
export function isSection(value: unknown): value is Section { if (!value || typeof value !== "object") return false; const section = value as Record<string, unknown>; return typeof section.id === "string" && typeof section.title === "string" && section.title.trim().length > 0 && Array.isArray(section.rows); }
export function section(id: string, title: string, rows: readonly Row[]): Section { if (!id || !title.trim()) throw new TypeError("section id and title are required"); return Object.freeze({ id, title, rows: Object.freeze([...rows]) }); }
