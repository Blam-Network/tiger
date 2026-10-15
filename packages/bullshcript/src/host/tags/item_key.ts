// Items are keyed by bundle and index together: two bundles can share a
// typeIndex, and one runtime is fed by every bundle of the activity.
export function itemKey(bundle: number, typeIndex: number): string {
  return `${(bundle >>> 0).toString(16)}:${typeIndex}`;
}
