import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";

/** App editor uses a custom schema (e.g. equation); use loose generics for helpers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- BlockNoteEditor schema varies by app
type AnyBlockNoteEditor = BlockNoteEditor<any, any, any>;

import { usePageTitlesStore } from "@/lib/page-titles-store";

/** Resolve page id from internal app href (relative or absolute). */
export function pageIdFromAppHref(href: string): string | null {
 try {
  const base =
   typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(href, base);
  const m = url.pathname.match(/^\/app\/([^/]+)$/);
  return m?.[1] ?? null;
 } catch {
  return null;
 }
}

type InlinePiece = Record<string, unknown>;

function linkDisplayText(content: unknown): string {
 if (!Array.isArray(content)) return "";
 return (content as InlinePiece[])
  .filter((c) => c && typeof c === "object" && c.type === "text" && typeof c.text === "string")
  .map((c) => c.text as string)
  .join("");
}

function firstTextStyles(content: unknown): Record<string, boolean> {
 if (!Array.isArray(content)) return {};
 const first = (content as InlinePiece[]).find(
  (c) => c && typeof c === "object" && c.type === "text",
 ) as { styles?: Record<string, boolean> } | undefined;
 return first?.styles && typeof first.styles === "object" ? { ...first.styles } : {};
}

function patchLinkToTitle(link: InlinePiece, newTitle: string): InlinePiece {
 const prevText = linkDisplayText(link.content);
 if (prevText === newTitle) return link;
 return {
  ...link,
  content: [{ type: "text", text: newTitle, styles: firstTextStyles(link.content) }],
 };
}

function patchInlineArray(
 inlines: unknown[],
 targetChildId: string,
 newTitle: string,
): { next: unknown[]; changed: boolean } {
 let changed = false;
 const next = inlines.map((item) => {
  if (!item || typeof item !== "object") return item;
  const o = item as InlinePiece;
  if (o.type === "link" && typeof o.href === "string") {
   const pid = pageIdFromAppHref(o.href);
   if (pid === targetChildId) {
    const patched = patchLinkToTitle(o, newTitle);
    if (patched !== o) changed = true;
    return patched;
   }
  }
  return item;
 });
 return { next, changed };
}

function patchTableContent(
 content: Record<string, unknown>,
 targetChildId: string,
 newTitle: string,
): Record<string, unknown> | null {
 const rows = content.rows;
 if (!Array.isArray(rows)) return null;
 let changed = false;
 const newRows = rows.map((row) => {
  if (!row || typeof row !== "object" || !("cells" in row)) return row;
  const cells = (row as { cells: unknown }).cells;
  if (!Array.isArray(cells)) return row;
  const newCells = cells.map((cell) => {
   if (Array.isArray(cell)) {
    const { next, changed: c } = patchInlineArray(cell, targetChildId, newTitle);
    if (c) changed = true;
    return c ? next : cell;
   }
   if (
    cell &&
    typeof cell === "object" &&
    (cell as InlinePiece).type === "tableCell" &&
    Array.isArray((cell as { content: unknown }).content)
   ) {
    const tc = cell as { content: unknown[] };
    const { next, changed: c } = patchInlineArray(tc.content, targetChildId, newTitle);
    if (c) {
     changed = true;
     return { ...tc, content: next };
    }
   }
   return cell;
  });
  return { ...(row as object), cells: newCells };
 });
 return changed ? { ...content, rows: newRows } : null;
}

function partialUpdateForSubpageLink(
 block: { id: string; type: string; content: unknown },
 targetChildId: string,
 newTitle: string,
): PartialBlock | null {
 if (Array.isArray(block.content)) {
  const { next, changed } = patchInlineArray(block.content, targetChildId, newTitle);
  return changed ? { content: next as PartialBlock["content"] } : null;
 }
 if (
  block.type === "table" &&
  block.content &&
  typeof block.content === "object" &&
  (block.content as InlinePiece).type === "tableContent"
 ) {
  const patched = patchTableContent(
   block.content as Record<string, unknown>,
   targetChildId,
   newTitle,
  );
  return patched ? { content: patched as PartialBlock["content"] } : null;
 }
 return null;
}

/** Update all links to `/app/{targetChildId}` in the editor to use `newTitle` as label. */
export function applySubpageLinkTitle(
 editor: AnyBlockNoteEditor,
 targetChildId: string,
 newTitle: string,
): void {
 const updates: {
  block: Parameters<AnyBlockNoteEditor["updateBlock"]>[0];
  partial: PartialBlock;
 }[] = [];
 editor.forEachBlock((block) => {
  const partial = partialUpdateForSubpageLink(block, targetChildId, newTitle);
  if (partial) updates.push({ block, partial });
  return true;
 });
 for (const { block, partial } of updates) {
  editor.updateBlock(block, partial);
 }
}

/** For each direct child of `parentPageId`, sync link labels to the current store title. */
export function reconcileSubpageLinksInEditor(
 editor: AnyBlockNoteEditor,
 parentPageId: string,
): void {
 const { childIdsByParentId, titlesByPageId } = usePageTitlesStore.getState();
 const children = childIdsByParentId[parentPageId] ?? [];
 for (const childId of children) {
  const title = titlesByPageId[childId];
  if (title === undefined) continue;
  applySubpageLinkTitle(editor, childId, title);
 }
}
