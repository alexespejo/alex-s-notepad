import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AuthHeaderClient } from "@/components/AuthHeaderClient";

export async function TopNav() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 transition-colors duration-150 dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
        >
          Home
        </Link>
        <span className="hidden h-4 w-px bg-zinc-300 dark:bg-zinc-700 sm:block" aria-hidden />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Alex&apos;s Notepad</span>
      </div>
      <AuthHeaderClient email={user?.email ?? null} />
    </header>
  );
}
