"use client";

import { useEffect, useRef, useState } from "react";
import { resolveAndUpdatePageTitle } from "@/lib/pages";

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
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setEditing(false);
  }, [pageId, initialTitle]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  async function commit() {
    const next = title.trim() || "Untitled";
    const previous = initialTitle.trim() || "Untitled";
    setEditing(false);

    if (next === previous) {
      setTitle(initialTitle);
      return;
    }

    try {
      const resolved = await resolveAndUpdatePageTitle(pageId, next);
      setTitle(resolved);
    } catch {
      setTitle(initialTitle);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setTitle(initialTitle);
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
      onDoubleClick={() => setEditing(true)}
      className={titleDisplayClassName}
      title="Double-click to rename"
    >
      {title}
    </h1>
  );
}
