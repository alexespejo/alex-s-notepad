"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PageNode } from "@/lib/pages";

function TreeRow({
  node,
  depth,
  activePageId,
  onCreateChild,
  onRename,
  onDelete,
}: {
  node: PageNode;
  depth: number;
  activePageId: string | null;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => void;
  onDelete: (pageId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);

  const hasChildren = node.children.length > 0;
  const isActive = activePageId !== null && node.id === activePageId;

  return (
    <div>
      <div
        className={
          isActive
            ? "group flex items-center gap-2 rounded-md bg-zinc-200/90 px-2 py-1 text-sm font-medium text-zinc-950 ring-1 ring-zinc-300/80 transition-colors duration-150 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-600"
            : "group flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-800 transition-colors duration-150 hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-900"
        }
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((v) => !v)}
          className="h-5 w-5 shrink-0 rounded transition-colors duration-150 hover:bg-zinc-300/70 dark:hover:bg-zinc-800"
          aria-label={open ? "Collapse" : "Expand"}
          disabled={!hasChildren}
        >
          {hasChildren ? (open ? "▾" : "▸") : "•"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/app/${node.id}`)}
          className="min-w-0 flex-1 truncate text-left"
          title={node.title}
        >
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditing(false);
                const next = title.trim() || "Untitled";
                if (next !== node.title) onRename(node.id, next);
                setTitle(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setEditing(false);
                  setTitle(node.title);
                }
              }}
              autoFocus
              className="w-full rounded bg-white px-2 py-1 text-sm text-zinc-950 outline-none ring-1 ring-zinc-300 dark:bg-black dark:text-zinc-50 dark:ring-zinc-700"
            />
          ) : (
            <span>{node.title}</span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onCreateChild(node.id)}
            className="rounded px-1.5 py-1 text-xs text-zinc-600 transition-colors duration-150 hover:bg-zinc-300/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Add child"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-1 text-xs text-zinc-600 transition-colors duration-150 hover:bg-zinc-300/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Rename"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="rounded px-1.5 py-1 text-xs text-zinc-600 transition-colors duration-150 hover:bg-zinc-300/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              activePageId={activePageId}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageTree({
  nodes,
  activePageId,
  onCreateChild,
  onRename,
  onDelete,
}: {
  nodes: PageNode[];
  activePageId: string | null;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => void;
  onDelete: (pageId: string) => void;
}) {
  const stableNodes = useMemo(() => nodes, [nodes]);

  if (!stableNodes.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No pages yet.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {stableNodes.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          activePageId={activePageId}
          onCreateChild={onCreateChild}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

