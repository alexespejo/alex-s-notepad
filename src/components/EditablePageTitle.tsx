"use client";

import { useEffect, useRef, useState } from "react";
import { resolveAndUpdatePageTitle } from "@/lib/pages";
import { usePageTitlesStore } from "@/lib/page-titles-store";

const titleTypography =
  "w-full max-w-full bg-transparent text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50";

const titleDisplayClassName = `${titleTypography} cursor-pointer underline decoration-zinc-400/70 decoration-2 underline-offset-[0.18em] transition-colors duration-150 hover:decoration-zinc-600 hover:text-zinc-800 dark:decoration-zinc-500 dark:hover:decoration-zinc-300 dark:hover:text-zinc-100`;

const titleInputClassName = `${titleTypography} outline-none ring-2 ring-zinc-400/80 ring-offset-2 ring-offset-white rounded-sm dark:ring-zinc-500 dark:ring-offset-black`;

export function EditablePageTitle({
  pageId,
  initialTitle,
}: {
  pageId: string;
  initialTitle: string;
}) {
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Title when this edit session started; used for Escape, commit no-op, and failed save revert. */
  const baselineAtEditStartRef = useRef(initialTitle);

  const syncedTitle = usePageTitlesStore((s) => s.titlesByPageId[pageId] ?? initialTitle);

  // Re-seed only when navigating to a different page. Do not depend on
  // `initialTitle` for the same pageId — RSC props can lag behind client renames
  // and would overwrite the zustand title the sidebar/editor already updated.
  useEffect(() => {
    const store = usePageTitlesStore.getState();
    const existing = store.titlesByPageId[pageId];
    const seed = existing !== undefined ? existing : initialTitle;
    store.setPageTitle(pageId, seed);
    setDraft(seed);
    baselineAtEditStartRef.current = seed;
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialTitle is read once per pageId transition only
  }, [pageId]);

  useEffect(() => {
    if (!editing) {
      setDraft(syncedTitle);
    }
  }, [syncedTitle, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  async function commit() {
    const next = draft.trim() || "Untitled";
    const baselineNorm =
      baselineAtEditStartRef.current.trim() || "Untitled";
    setEditing(false);

    if (next === baselineNorm) {
      usePageTitlesStore.getState().setPageTitle(pageId, next);
      setDraft(next);
      return;
    }

    try {
      const resolved = await resolveAndUpdatePageTitle(pageId, next);
      usePageTitlesStore.getState().setPageTitle(pageId, resolved);
      setDraft(resolved);
      baselineAtEditStartRef.current = resolved;
    } catch {
      usePageTitlesStore.getState().setPageTitle(pageId, baselineAtEditStartRef.current);
      setDraft(baselineAtEditStartRef.current);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          usePageTitlesStore.getState().setPageTitle(pageId, v);
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            usePageTitlesStore.getState().setPageTitle(
              pageId,
              baselineAtEditStartRef.current,
            );
            setDraft(baselineAtEditStartRef.current);
            setEditing(false);
          }
        }}
        className={titleInputClassName}
        aria-label="Page title"
      />
    );
  }

  return (
    <h1
      onDoubleClick={() => {
        const b = usePageTitlesStore.getState().titlesByPageId[pageId] ?? initialTitle;
        baselineAtEditStartRef.current = b;
        setDraft(b);
        setEditing(true);
      }}
      className={titleDisplayClassName}
      title="Double-click to rename"
    >
      {syncedTitle}
    </h1>
  );
}
