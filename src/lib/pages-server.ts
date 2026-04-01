import type { PageRow } from "@/lib/pages";
import { createSupabaseServer } from "@/lib/supabase/server";

export type RootPageSummary = Pick<PageRow, "id" | "title">;

export async function getPageByIdForUser(pageId: string): Promise<PageRow | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("pages").select("*").eq("id", pageId).maybeSingle();

  if (error) throw error;
  return data;
}

export async function listRootPagesForUser(): Promise<RootPageSummary[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("pages")
    .select("id, title")
    .is("parent_id", null)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
