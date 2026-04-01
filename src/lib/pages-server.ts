import type { PageRow } from "@/lib/pages";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function getPageByIdForUser(pageId: string): Promise<PageRow | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("pages").select("*").eq("id", pageId).maybeSingle();

  if (error) throw error;
  return data;
}
