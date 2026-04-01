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

  const syncedTitle = usePageTitlesStore((s) => s.titlesByPageId[pageId] ?? initialTitle);

  useEffect(() => {
    usePageTitlesStore.getState().setPageTitle(pageId, initialTitle);
    setDraft(initialTitle);
    setEditing(false);
  }, [pageId, initialTitle]);

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
    setEditing(false);
    const prevRaw = usePageTitlesStore.getState().titlesByPageId[pageId] ?? initialTitle;
    const prev = prevRaw.trim() || "Untitled";

    if (next === prev) {
      setDraft(prevRaw);
      return;
    }

    try {
      const resolved = await resolveAndUpdatePageTitle(pageId, next);
      usePageTitlesStore.getState().setPageTitle(pageId, resolved);
      setDraft(resolved);
    } catch {
      setDraft(prevRaw);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(syncedTitle);
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
        setDraft(syncedTitle);
        setEditing(true);
      }}
      className={titleDisplayClassName}
      title="Double-click to rename"
    >
      {syncedTitle}
    </h1>
  );
}
