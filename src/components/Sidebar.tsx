"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  createPage,
  deletePage,
  listPagesTree,
  movePage,
  resolveAndUpdatePageTitle,
} from "@/lib/pages";
import type { PageNode } from "@/lib/pages";
import { NewPageButton } from "@/components/NewPageButton";
import { PageTree } from "@/components/PageTree";

export function Sidebar() {
  const pathname = usePathname();
  const activePageId = useMemo(() => {
    const m = pathname?.match(/^\/app\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingEditPageId, setPendingEditPageId] = useState<string | null>(null);

  async function loadTree(opts?: { initial?: boolean }) {
    const initial = opts?.initial ?? false;
    if (initial) {
      setLoading(true);
    }
    setError(null);
    try {
      const next = await listPagesTree();
      setTree(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pages");
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadTree({ initial: true });
  }, []);

  return (
    <aside className="flex h-dvh w-72 flex-col border-r border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center px-2 py-2">
        <NewPageButton
          label="New Page"
          onClick={async () => {
            const page = await createPage({ parent_id: null });
            setPendingEditPageId(page.id);
            await loadTree();
          }}
        />
      </div>

      <div className="mt-2 flex-1 overflow-auto">
        {loading ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : (
          <PageTree
            nodes={tree}
            activePageId={activePageId}
            pendingEditPageId={pendingEditPageId}
            onCreateChild={async (parentId) => {
              const page = await createPage({ parent_id: parentId });
              setPendingEditPageId(page.id);
              await loadTree();
            }}
            onRename={async (pageId, title) => {
              await resolveAndUpdatePageTitle(pageId, title);
              setPendingEditPageId((p) => (p === pageId ? null : p));
              await loadTree();
            }}
            onClearPendingEdit={(pageId) => {
              setPendingEditPageId((p) => (p === pageId ? null : p));
            }}
            onDelete={async (pageId) => {
              await deletePage(pageId);
              setPendingEditPageId((p) => (p === pageId ? null : p));
              await loadTree();
            }}
            onMovePage={async (draggedId, target) => {
              await movePage(draggedId, target);
              await loadTree();
            }}
          />
        )}
      </div>
    </aside>
  );
}
