import { createSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type PageRow = Database["public"]["Tables"]["pages"]["Row"];
export type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
export type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

export type PageNode = PageRow & { children: PageNode[] };

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
    nodes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}

export async function listPagesTree(): Promise<PageNode[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });

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

export async function createPage(input?: {
  parent_id?: string | null;
  title?: string;
}): Promise<PageRow> {
  const supabase = createSupabaseClient();
  const payload: PageInsert = {
    parent_id: input?.parent_id ?? null,
    title: input?.title ?? "Untitled",
    content: [],
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

