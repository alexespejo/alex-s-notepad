const INDEXED_SUFFIX = /^(.+?) \((\d+)\)$/;

export function parseIndexedTitle(title: string): { base: string } {
  const m = title.trim().match(INDEXED_SUFFIX);
  if (m) return { base: m[1].trimEnd() };
  return { base: title.trim() || "Untitled" };
}

/**
 * Returns a title distinct from sibling titles (case-sensitive). When renaming,
 * pass `excludePageId` so the page's current title does not count as a collision.
 */
export function uniqueTitleAmong(
  desired: string,
  siblingRows: { id: string; title: string }[],
  excludePageId?: string,
): string {
  const trimmed = desired.trim() || "Untitled";
  const others = siblingRows
    .filter((s) => s.id !== excludePageId)
    .map((s) => s.title);
  const used = new Set(others);
  if (!used.has(trimmed)) return trimmed;
  const { base } = parseIndexedTitle(trimmed);
  let n = 1;
  let candidate = `${base} (${n})`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})`;
  }
  return candidate;
}
