"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovePlacement, PageNode } from "@/lib/pages";

const dragId = (pageId: string) => `drag|${pageId}`;
const dropId = (pageId: string, placement: MovePlacement) => `drop|${pageId}|${placement}`;

function parseDropId(id: string): { targetId: string; placement: MovePlacement } | null {
  const parts = id.split("|");
  if (parts.length !== 3 || parts[0] !== "drop") return null;
  const p = parts[2];
  if (p !== "before" && p !== "after" && p !== "inside") return null;
  return { targetId: parts[1], placement: p };
}

function TreeRow({
  node,
  depth,
  activePageId,
  pendingEditPageId,
  showDropZones,
  onCreateChild,
  onRename,
  onDelete,
  onClearPendingEdit,
}: {
  node: PageNode;
  depth: number;
  activePageId: string | null;
  pendingEditPageId: string | null;
  showDropZones: boolean;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => void | Promise<void>;
  onDelete: (pageId: string) => void;
  onClearPendingEdit?: (pageId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(() => pendingEditPageId === node.id);
  const [title, setTitle] = useState(node.title);

  useEffect(() => {
    setTitle(node.title);
  }, [node.title]);

  useEffect(() => {
    if (pendingEditPageId === node.id) {
      setEditing(true);
    }
  }, [pendingEditPageId, node.id]);

  const { attributes, listeners, setNodeRef: setDragHandleRef, isDragging } = useDraggable({
    id: dragId(node.id),
    data: { pageId: node.id },
  });

  const dropBefore = useDroppable({
    id: dropId(node.id, "before"),
    data: { targetId: node.id, placement: "before" as const },
  });
  const dropInside = useDroppable({
    id: dropId(node.id, "inside"),
    data: { targetId: node.id, placement: "inside" as const },
  });
  const dropAfter = useDroppable({
    id: dropId(node.id, "after"),
    data: { targetId: node.id, placement: "after" as const },
  });

  const hasChildren = node.children.length > 0;
  const isActive = activePageId !== null && node.id === activePageId;
  const isAutoEdit = pendingEditPageId === node.id;

  const rowBase =
    "group relative flex min-h-8 items-center gap-1 px-2 py-0.5 text-sm transition-[background-color] duration-150 ease-out rounded-none";
  const rowTone =
    isAutoEdit
      ? "bg-amber-100/80 font-medium text-zinc-950 dark:bg-amber-950/40 dark:text-zinc-50"
      : isActive
        ? "bg-zinc-200/90 font-medium text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
        : "text-zinc-800 hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-900";

  const rowClass = `${rowBase} ${rowTone}`;

  const zoneBase = showDropZones
    ? "pointer-events-auto absolute left-0 right-0 z-[5]"
    : "pointer-events-none absolute left-0 right-0 z-[5]";

  const beforeHighlight = dropBefore.isOver ? "border-t-2 border-t-sky-500" : "";
  const insideHighlight = dropInside.isOver ? "bg-sky-500/15" : "";
  const afterHighlight = dropAfter.isOver ? "border-b-2 border-b-sky-500" : "";

  return (
    <div>
      <div className={rowClass} style={{ paddingLeft: 6 + depth * 14 }}>
        <div
          ref={dropBefore.setNodeRef}
          className={`${zoneBase} top-0 h-[32%] ${beforeHighlight}`}
          aria-hidden
        />
        <div
          ref={dropInside.setNodeRef}
          className={`${zoneBase} top-[32%] h-[36%] ${insideHighlight}`}
          aria-hidden
        />
        <div
          ref={dropAfter.setNodeRef}
          className={`${zoneBase} bottom-0 h-[32%] ${afterHighlight}`}
          aria-hidden
        />

        <div
          className={`relative z-10 flex min-h-7 flex-1 items-center gap-1 ${isDragging ? "opacity-40" : ""}`}
        >
          <button
            type="button"
            ref={setDragHandleRef}
            className="flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 hover:bg-zinc-300/60 active:cursor-grabbing dark:hover:bg-zinc-800"
            title="Drag to reorder"
            aria-label="Drag to reorder"
            {...listeners}
            {...attributes}
          >
            <span className="text-[10px] leading-none tracking-[-0.2em]">⠿</span>
          </button>

          <button
            type="button"
            onClick={() => hasChildren && setOpen((v) => !v)}
            className="h-5 w-5 shrink-0 rounded-none transition-colors duration-150 hover:bg-zinc-300/70 dark:hover:bg-zinc-800"
            aria-label={open ? "Collapse" : "Expand"}
            disabled={!hasChildren}
          >
            {hasChildren ? (open ? "▾" : "▸") : "•"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/app/${node.id}`)}
            className="min-w-0 flex-1 truncate rounded-none text-left"
            title={node.title}
          >
            {editing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setEditing(false);
                  const next = title.trim() || "Untitled";
                  if (next !== node.title) {
                    void onRename(node.id, next);
                  } else {
                    onClearPendingEdit?.(node.id);
                  }
                  setTitle(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setTitle(node.title);
                    onClearPendingEdit?.(node.id);
                  }
                }}
                autoFocus
                className="w-full rounded-sm bg-white px-2 py-0.5 text-sm text-zinc-950 outline-none ring-1 ring-zinc-300 dark:bg-black dark:text-zinc-50 dark:ring-zinc-700"
              />
            ) : (
              <span>{node.title}</span>
            )}
          </button>

          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
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
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              activePageId={activePageId}
              pendingEditPageId={pendingEditPageId}
              showDropZones={showDropZones}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              onClearPendingEdit={onClearPendingEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function findNodeById(nodes: PageNode[], id: string): PageNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findNodeById(n.children, id);
    if (c) return c;
  }
  return null;
}

export function PageTree({
  nodes,
  activePageId,
  pendingEditPageId,
  onCreateChild,
  onRename,
  onDelete,
  onClearPendingEdit,
  onMovePage,
}: {
  nodes: PageNode[];
  activePageId: string | null;
  pendingEditPageId: string | null;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => void | Promise<void>;
  onDelete: (pageId: string) => void;
  onClearPendingEdit?: (pageId: string) => void;
  onMovePage: (draggedId: string, target: { targetId: string; placement: MovePlacement }) => Promise<void>;
}) {
  const stableNodes = useMemo(() => nodes, [nodes]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const parsed = parseDropId(String(over.id));
    if (!parsed) return;
    const dragStr = String(active.id);
    if (!dragStr.startsWith("drag|")) return;
    const draggedPageId = dragStr.slice(5);
    if (draggedPageId === parsed.targetId && parsed.placement === "inside") return;
    await onMovePage(draggedPageId, {
      targetId: parsed.targetId,
      placement: parsed.placement,
    });
  }

  const dragPageId =
    activeDragId !== null && activeDragId.startsWith("drag|") ? activeDragId.slice(5) : null;
  const activeNode = dragPageId ? findNodeById(stableNodes, dragPageId) : null;

  if (!stableNodes.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No pages yet.
      </div>
    );
  }

  const showDropZones = activeDragId !== null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(e) => void handleDragEnd(e)}>
      <div className="space-y-0">
        {stableNodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            activePageId={activePageId}
            pendingEditPageId={pendingEditPageId}
            showDropZones={showDropZones}
            onCreateChild={onCreateChild}
            onRename={onRename}
            onDelete={onDelete}
            onClearPendingEdit={onClearPendingEdit}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className="flex max-w-56 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm shadow-md dark:border-zinc-700 dark:bg-zinc-900">
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{activeNode.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
