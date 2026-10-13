// The Bundles tab's "Current slice" filter. No imports but types, so the
// smoke test runs it under plain Node.
import type { Bundle, TigerPlayer } from "./protocol";

// The slice (bubble.state) a player of the target stands in: the followed
// player's when they're in it, else the first player's who is.
export function currentSlice(
  players: TigerPlayer[],
  following: string | undefined,
  targetId: string | undefined
): string | undefined {
  if (!targetId) {
    return;
  }
  const inTarget = players.filter((p) => p.targetId === targetId && p.bubble);
  return (inTarget.find((p) => p.id === following) ?? inTarget[0])?.bubble;
}

// A bundle belongs to the slice when its bubbles name it, or the bubble's
// base state (a phase keeps its bubble's bundles). Global bundles (no
// bubbles: built once per activity) are not the slice's own and stay out.
export function loadsInSlice(bundle: Pick<Bundle, "bubbles">, slice: string): boolean {
  if (!bundle.bubbles?.length) {
    return false;
  }
  const base = `${slice.split(".")[0]}.0`;
  return bundle.bubbles.includes(slice) || bundle.bubbles.includes(base);
}
