import { createSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { uniqueTitleAmong } from "@/lib/page-titles";

export type PageRow = Database["public"]["Tables"]["pages"]["Row"];
export type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
export type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

export type PageNode = PageRow & { children: PageNode[] };

function sortSiblings(nodes: PageNode[]) {
  nodes.sort((a, b) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    if (pa !== pb) return pa - pb;
    return a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id);
  });
}

function buildTree(rows: PageRow[]): PageNode[] {
  const byId = new Map<string, PageNode>();
  for (const row of rows) byId.set(row.id, { ...row, children: [] });

  const roots: PageNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: PageNode[]) => {
    sortSiblings(nodes);
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}

/** Walk up parent pointers: true if `nodeId` is anywhere under `ancestorId`. */
function isDescendantOf(
  ancestorId: string,
  nodeId: string | null,
  parentMap: Map<string, string | null>,
): boolean {
  let cur: string | null = nodeId;
  while (cur !== null) {
    if (cur === ancestorId) return true;
    cur = parentMap.get(cur) ?? null;
  }
  return false;
}

export async function listPagesTree(): Promise<PageNode[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from("pages").select("*");

  if (error) throw error;
  return buildTree(data ?? []);
}

export async function getPageById(pageId: string): Promise<PageRow | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listSiblingRows(parentId: string | null) {
  const supabase = createSupabaseClient();
  let q = supabase.from("pages").select("id, title, position").order("position", { ascending: true });
  if (parentId === null) q = q.is("parent_id", null);
  else q = q.eq("parent_id", parentId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createPage(input?: {
  parent_id?: string | null;
  title?: string;
}): Promise<PageRow> {
  const supabase = createSupabaseClient();
  const parentId = input?.parent_id ?? null;
  const siblings = await listSiblingRows(parentId);
  const desired = input?.title?.trim() || "Untitled";
  const title = uniqueTitleAmong(
    desired,
    siblings.map((s) => ({ id: s.id, title: s.title })),
  );
  const maxPos =
    siblings.length === 0 ? -1 : Math.max(...siblings.map((s) => s.position ?? 0));

  const payload: PageInsert = {
    parent_id: parentId,
    title,
    content: [],
    position: maxPos + 1,
  };

  const { data, error } = await supabase
    .from("pages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePageTitle(pageId: string, title: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("pages")
    .update({ title } satisfies PageUpdate)
    .eq("id", pageId);
  if (error) throw error;
}

/** Resolve sibling-unique title and persist. Returns the title written. */
export async function resolveAndUpdatePageTitle(pageId: string, desired: string): Promise<string> {
  const page = await getPageById(pageId);
  if (!page) throw new Error("Page not found");
  const siblings = await listSiblingRows(page.parent_id);
  const title = uniqueTitleAmong(
    desired,
    siblings.map((s) => ({ id: s.id, title: s.title })),
    pageId,
  );
  if (title !== page.title) {
    await updatePageTitle(pageId, title);
  }
  return title;
}

export async function updatePageContent(pageId: string, content: PageUpdate["content"]) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("pages")
    .update({ content } satisfies PageUpdate)
    .eq("id", pageId);
  if (error) throw error;
}

export async function deletePage(pageId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) throw error;
}

export type MovePlacement = "before" | "after" | "inside";

export async function movePage(
  draggedId: string,
  args: { targetId: string; placement: MovePlacement },
): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: rows, error: fetchErr } = await supabase
    .from("pages")
    .select("id, parent_id, position");
  if (fetchErr) throw fetchErr;
  const list = rows ?? [];

  const parentMap = new Map(list.map((r) => [r.id, r.parent_id] as const));
  const rowById = new Map(list.map((r) => [r.id, r]));

  const dragged = rowById.get(draggedId);
  const target = rowById.get(args.targetId);
  if (!dragged || !target) throw new Error("Page not found");
  if (draggedId === args.targetId && args.placement !== "inside") return;

  let newParentId: string | null;
  let newSiblings: string[];

  const key = (p: string | null) => p ?? "__root__";
  const childrenByParent = new Map<string, string[]>();
  for (const r of list) {
    const k = key(r.parent_id);
    if (!childrenByParent.has(k)) childrenByParent.set(k, []);
    childrenByParent.get(k)!.push(r.id);
  }
  for (const ids of childrenByParent.values()) {
    ids.sort((a, b) => {
      const ra = rowById.get(a)!;
      const rb = rowById.get(b)!;
      return ra.position - rb.position || a.localeCompare(b);
    });
  }

  const getChildren = (parentId: string | null) => [
    ...(childrenByParent.get(key(parentId)) ?? []),
  ];

  if (args.placement === "inside") {
    newParentId = args.targetId;
    if (newParentId === draggedId) return;
    if (isDescendantOf(draggedId, newParentId, parentMap)) return;
    newSiblings = getChildren(args.targetId).filter((id) => id !== draggedId);
    newSiblings.unshift(draggedId);
  } else {
    newParentId = target.parent_id;
    if (isDescendantOf(draggedId, newParentId, parentMap)) return;
    newSiblings = getChildren(newParentId).filter((id) => id !== draggedId);
    const tIdx = newSiblings.indexOf(args.targetId);
    if (tIdx === -1) return;
    const insertAt = args.placement === "before" ? tIdx : tIdx + 1;
    newSiblings.splice(insertAt, 0, draggedId);
  }

  const oldParent = dragged.parent_id;

  if (oldParent !== newParentId) {
    const oldSiblings = getChildren(oldParent).filter((id) => id !== draggedId);
    for (let i = 0; i < oldSiblings.length; i++) {
      const { error } = await supabase
        .from("pages")
        .update({ parent_id: oldParent, position: i } satisfies PageUpdate)
        .eq("id", oldSiblings[i]);
      if (error) throw error;
    }
  }

  for (let i = 0; i < newSiblings.length; i++) {
    const { error } = await supabase
      .from("pages")
      .update({ parent_id: newParentId, position: i } satisfies PageUpdate)
      .eq("id", newSiblings[i]);
    if (error) throw error;
  }
}

export type PageLinkSearchRow = Pick<PageRow, "id" | "title">;

/**
 * Search pages by title for @-mentions / internal links. Wildcards in the query are stripped so
 * user input cannot broaden an ilike pattern.
 */
export async function searchPagesForLink(
  query: string,
  opts?: { excludeId?: string; limit?: number },
): Promise<PageLinkSearchRow[]> {
  const supabase = createSupabaseClient();
  const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 50);
  const safeQuery = query.trim().replace(/[%_\\]/g, "");

  let q = supabase
    .from("pages")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (opts?.excludeId) {
    q = q.neq("id", opts.excludeId);
  }

  if (safeQuery.length > 0) {
    q = q.ilike("title", `%${safeQuery}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
