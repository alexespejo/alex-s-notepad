import { createSupabaseServer } from "@/lib/supabase/server";
import { AuthHeaderClient } from "@/components/AuthHeaderClient";

export async function TopNav() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 transition-colors duration-150 dark:border-zinc-800 dark:bg-black">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Alex&apos;s Notepad</div>
      <AuthHeaderClient email={user?.email ?? null} />
    </header>
  );
}
