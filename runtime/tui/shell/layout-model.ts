export type LayoutRegion = "primary" | "secondary" | "tertiary" | "agents" | "attention" | "activity" | "runtimeHealth";
export type ResponsiveLayout = Readonly<{
  mode: "compact" | "standard" | "wide" | "ultrawide";
  regions: readonly LayoutRegion[];
  rail: boolean;
  footerLines: number;
}>;

export function composeResponsiveLayout(input: Readonly<{
  width: number;
  height: number;
  hasGraph?: boolean;
  hasAgent?: boolean;
  hasInspector?: boolean;
  hasAttention?: boolean;
}>): ResponsiveLayout {
  const mode = input.width < 90 ? "compact" : input.width < 120 ? "standard" : input.width < 160 ? "wide" : "ultrawide";
  if (mode === "compact") {
    return Object.freeze({ mode, regions: Object.freeze(["primary"]), rail: false, footerLines: input.height <= 24 ? 1 : 2 });
  }
  const regions: LayoutRegion[] = ["primary"];
  if (input.hasAgent || input.hasInspector) regions.push("secondary");
  if ((mode === "wide" || mode === "ultrawide") && input.hasAgent && input.hasInspector) regions.push("tertiary");
  if (mode === "ultrawide") {
    if (input.hasAgent !== false) regions.push("agents");
    if (input.hasAttention !== false) regions.push("attention");
    regions.push("activity");
    regions.push("runtimeHealth");
  }
  return Object.freeze({
    mode,
    regions: Object.freeze([...new Set(regions)]),
    rail: true,
    footerLines: input.height <= 24 ? 1 : 2,
  });
}

export type NextActionKind =
  | "critical_attention"
  | "human_gate"
  | "failure"
  | "blocked_task"
  | "verification_failure"
  | "active_execution"
  | "recommendation"
  | "optional_action";

export type NextActionInput = Readonly<{
  criticalAttention?: number;
  attention?: number;
  humanGate?: boolean;
  failures?: number;
  blocked?: number;
  verificationFailures?: number;
  running?: number;
  recommendations?: number;
  optionalActions?: number;
  targetId?: string;
}>;

export type NextActionResult = Readonly<{
  priority: number;
  kind: NextActionKind;
  message: string;
  targetId?: string;
}>;

export function resolveNextAction(input: NextActionInput): NextActionResult | null {
  if (Number(input.criticalAttention || 0) > 0) {
    return Object.freeze({
      priority: 1,
      kind: "critical_attention",
      message: `⚠ ${input.criticalAttention} decisão crítica pendente`,
      targetId: input.targetId,
    });
  }
  if (input.humanGate) {
    return Object.freeze({
      priority: 2,
      kind: "human_gate",
      message: "◆ Gate humano aguardando aprovação explícita (pressione Enter para abrir)",
      targetId: input.targetId,
    });
  }
  if (Number(input.failures || 0) > 0) {
    return Object.freeze({
      priority: 3,
      kind: "failure",
      message: `✕ ${input.failures} falha de execução detectada — inspecione o log`,
      targetId: input.targetId,
    });
  }
  if (Number(input.blocked || 0) > 0) {
    return Object.freeze({
      priority: 4,
      kind: "blocked_task",
      message: `⊘ ${input.blocked} tarefa bloqueada por dependências incompletas`,
      targetId: input.targetId,
    });
  }
  if (Number(input.verificationFailures || 0) > 0) {
    return Object.freeze({
      priority: 5,
      kind: "verification_failure",
      message: `✕ ${input.verificationFailures} verificação falhou — verifique os critérios de aceite`,
      targetId: input.targetId,
    });
  }
  if (Number(input.running || 0) > 0) {
    return Object.freeze({
      priority: 6,
      kind: "active_execution",
      message: `● ${input.running} execução ativa — Enter para interagir na PTY`,
      targetId: input.targetId,
    });
  }
  if (Number(input.recommendations || 0) > 0) {
    return Object.freeze({
      priority: 7,
      kind: "recommendation",
      message: "→ Recomendação do Maestro disponível na paleta (Ctrl+K)",
      targetId: input.targetId,
    });
  }
  if (Number(input.optionalActions || 0) > 0) {
    return Object.freeze({
      priority: 8,
      kind: "optional_action",
      message: "+ Ações opcionais: A novo agente · M nova missão · S novo shell",
      targetId: input.targetId,
    });
  }
  if (Number(input.attention || 0) > 0) {
    return Object.freeze({
      priority: 1,
      kind: "critical_attention",
      message: `⚠ ${input.attention} intervenção necessária`,
      targetId: input.targetId,
    });
  }
  return null;
}

export function nextActionVisibility(input: NextActionInput): boolean {
  return resolveNextAction(input) !== null;
}

export type FocusGrammarInput = Readonly<{
  entityType?: "tab" | "window" | "task" | "agent" | "general";
  active?: boolean;
  selected?: boolean;
  focused?: boolean;
  attention?: boolean;
  running?: boolean;
  hovered?: boolean;
}>;

export type FocusGrammarResult = Readonly<{
  marker: string;
  border: "none" | "single" | "single-bold" | "double" | "heavy" | "dashed" | "single-muted";
  weight: "faint" | "normal" | "bold";
  label: string;
  emphasis: "active" | "focused" | "selected" | "alert" | "background" | "hover" | "muted";
}>;

export function focusGrammar(input: FocusGrammarInput): FocusGrammarResult {
  if (input.entityType === "tab" && (input.active || (input.focused && input.selected))) {
    return Object.freeze({ marker: "◆", border: "double", weight: "bold", label: "active-tab", emphasis: "active" });
  }
  if (input.attention) {
    return Object.freeze({ marker: "⚠", border: "heavy", weight: "bold", label: "attention", emphasis: "alert" });
  }
  if (input.focused && input.selected) {
    return Object.freeze({ marker: "▸", border: "single-bold", weight: "bold", label: "selected", emphasis: "focused" });
  }
  if (input.selected) {
    return Object.freeze({ marker: "▸", border: "single", weight: "normal", label: "selected", emphasis: "selected" });
  }
  if (input.hovered) {
    return Object.freeze({ marker: "▫", border: "dashed", weight: "normal", label: "clickable", emphasis: "hover" });
  }
  if (input.running) {
    return Object.freeze({ marker: "●", border: "single-muted", weight: "normal", label: "running", emphasis: "background" });
  }
  return Object.freeze({ marker: "○", border: "none", weight: "faint", label: "idle", emphasis: "muted" });
}
