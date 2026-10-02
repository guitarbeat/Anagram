/**
 * filterHelpers.ts
 * Reusable utility helpers for length filtering, set normalization, and multi-selection
 */

export function normalizeLengthFilterToSet(
  filter: number[] | number | null | undefined
): Set<number> {
  if (filter === null || filter === undefined) return new Set<number>();
  if (Array.isArray(filter)) return new Set(filter);
  return new Set([filter]);
}

/**
 * Toggles a word length in an existing length filter.
 * - If isMultiSelect is false: toggling the active lone selection clears it; otherwise selects only this length.
 * - If isMultiSelect is true: adds or removes the length from the active set.
 */
export function toggleLengthFilter(
  currentFilter: number[] | number | null | undefined,
  lengthToToggle: number,
  isMultiSelect = false
): number[] | null {
  const currentSet = normalizeLengthFilterToSet(currentFilter);

  if (isMultiSelect) {
    if (currentSet.has(lengthToToggle)) {
      currentSet.delete(lengthToToggle);
    } else {
      currentSet.add(lengthToToggle);
    }
    return currentSet.size === 0 ? null : Array.from(currentSet).sort((a, b) => a - b);
  }

  // Single selection mode:
  // If this length is already the only one selected, toggle it off (clear filter)
  if (currentSet.size === 1 && currentSet.has(lengthToToggle)) {
    return null;
  }
  return [lengthToToggle];
}
