"use client";

import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export function AuthHeaderClient({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <span className="max-w-[200px] truncate text-xs text-zinc-500 dark:text-zinc-400" title={email}>
          {email}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Sign out
      </button>
    </div>
  );
}
