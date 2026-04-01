import Link from "next/link";
import { listRootPagesForUser } from "@/lib/pages-server";

export default async function HomePage() {
  const roots = await listRootPagesForUser();

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 py-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Home
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Open a top-level page or create one from the sidebar.
        </p>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No pages yet. Use <span className="font-medium">New Page</span> in the sidebar to add your first
          note.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {roots.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/${p.id}`}
                className="block px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Sub-pages are listed in the{" "}
        <span className="font-medium text-zinc-600 dark:text-zinc-400">sidebar</span> only.
      </p>
    </div>
  );
}
