/**
 * Sort tasks by display_order (ascending), with tasks without display_order at the end
 */
export function sortByDisplayOrder<T extends { display_order?: number }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    if (a.display_order !== undefined) return -1;
    if (b.display_order !== undefined) return 1;
    return 0;
  });
}
