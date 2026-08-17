export type GraphTier = "COMPACT" | "NORMAL" | "WIDE" | "ULTRAWIDE";
export function tierLayoutFor(tier: GraphTier, _projections: unknown, floatingProven = false) {
  if (tier === "COMPACT") return Object.freeze({ mode: "list", primary: "compact", overlay: "inspector" });
  if (tier === "NORMAL") return Object.freeze({ mode: "tiled", primary: "tree", sidebar: "inspector" });
  if (tier === "WIDE") return Object.freeze({ mode: "dual", primary: "lanes", sidebar: "dock", overlay: "inspector" });
  return floatingProven
    ? Object.freeze({ mode: "floating", primary: "waves", sidebar: "inspector", overlay: "attention-floating" })
    : Object.freeze({ mode: "dual", primary: "waves", sidebar: "attention-dock", overlay: "inspector" });
}
