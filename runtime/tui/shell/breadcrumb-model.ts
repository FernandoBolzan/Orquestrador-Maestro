"use strict";

export interface BreadcrumbInput {
  projectName: string;
  missionTitle?: string;
  waveNumber?: number;
  selectedTaskId?: string;
}

export interface BreadcrumbModel {
  segments: string[];
}

export function deriveBreadcrumb(input: BreadcrumbInput): BreadcrumbModel {
  const segments: string[] = [input.projectName || "Workspace"];
  if (input.missionTitle) {
    segments.push(input.missionTitle);
  }
  if (input.waveNumber !== undefined) {
    segments.push(`Wave ${input.waveNumber}`);
  }
  if (input.selectedTaskId) {
    segments.push(input.selectedTaskId);
  }
  return { segments };
}

export function formatBreadcrumb(model: BreadcrumbModel): string {
  return model.segments.join(" › ");
}
