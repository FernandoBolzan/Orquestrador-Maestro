export type NavigationProject = Readonly<{ id: string; name: string; status?: string; badge?: string }>;
export type WorkspaceTab = Readonly<{ id: string; kind: "cockpit" | "project"; projectId?: string; name: string; badge?: string }>;

export const COCKPIT_TAB_ID = "cockpit";

export function buildWorkspaceTabs(projects: readonly NavigationProject[]): readonly WorkspaceTab[] {
  return Object.freeze([
    Object.freeze({ id: COCKPIT_TAB_ID, kind: "cockpit" as const, name: "⌂ Cockpit" }),
    ...projects.map((project) => Object.freeze({
      id: project.id,
      kind: "project" as const,
      projectId: project.id,
      name: project.name,
      ...(project.badge ? { badge: project.badge } : {}),
    })),
  ]);
}

export function isCockpitTab(id: string): boolean { return id === COCKPIT_TAB_ID; }

export function railVisibility(surface: "cockpit" | "project"): boolean {
  return surface === "cockpit";
}

export function primaryWorkspaceSurface(input: Readonly<{ hasTaskGraph: boolean; width: number }>): "taskgraph" | "mission" {
  return input.hasTaskGraph ? "taskgraph" : "mission";
}
