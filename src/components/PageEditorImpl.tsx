"use client";

import "@blocknote/core/fonts/inter.css";
import { insertOrUpdateBlockForSlashMenu, filterSuggestionItems } from "@blocknote/core/extensions";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Transaction } from "@tiptap/pm/state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiLinkM } from "react-icons/ri";

import { equationSlashMenuIcon } from "@/components/blocks/EquationBlock";
import { appBlockNoteSchema } from "@/lib/blockNoteSchema";
import { searchPagesForLink, updatePageContent } from "@/lib/pages";
import { resolveImageUrlForEditor, uploadEditorImageForPage } from "@/lib/storage";
import type { Json } from "@/lib/supabase/types";

type SaveState = "idle" | "saving" | "saved" | "error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function looksLikeBlock(value: unknown): value is { type: string } {
  return isRecord(value) && typeof value.type === "string";
}

function isBlockArray(value: unknown): value is { type: string }[] {
  return Array.isArray(value) && value.length > 0 && value.every(looksLikeBlock);
}

export default function PageEditorImpl({
  pageId,
  initialContent,
  debounceMs = 900,
}: {
  pageId: string;
  initialContent: Json;
  debounceMs?: number;
}) {
  const initialBlocks = useMemo(() => {
    return isBlockArray(initialContent) ? initialContent : undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote(
    {
      schema: appBlockNoteSchema,
      initialContent: initialBlocks,
      uploadFile: async (file) => uploadEditorImageForPage(pageId, file),
      resolveFileUrl: resolveImageUrlForEditor,
      tables: {
        splitCells: true,
        headers: true,
        cellBackgroundColor: true,
        cellTextColor: true,
      },
    },
    [pageId, initialBlocks],
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const latestDocRef = useRef<typeof editor.document | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(() => {
    latestDocRef.current = editor.document;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSaveState("saving");
    setErrorText(null);

    timeoutRef.current = setTimeout(() => {
      const doc = latestDocRef.current ?? editor.document;
      const payload = doc as unknown as Json;

      const run = async () => {
        await updatePageContent(pageId, payload);
      };

      void run()
        .then(() => {
          setSaveState("saved");
        })
        .catch((e) => {
          setSaveState("error");
          setErrorText(e instanceof Error ? e.message : "Failed to save");
        });
    }, debounceMs);
  }, [debounceMs, editor, pageId]);

  useEffect(() => {
    return editor.onChange(() => {
      scheduleSave();
    });
  }, [editor, scheduleSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getSlashItems = useCallback(
    async (query: string) => {
      const defaults = getDefaultReactSlashMenuItems(editor);
      const equationItem = {
        title: "Equation (LaTeX)",
        subtext: "Display math with KaTeX",
        aliases: ["math", "latex", "katex", "equation"],
        icon: equationSlashMenuIcon(),
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, {
            type: "equation",
            props: { latex: "" },
          }),
      };
      return filterSuggestionItems([...defaults, equationItem], query);
    },
    [editor],
  );

  const pageLinkMenuIcon = useMemo(() => <RiLinkM size={18} />, []);

  const getPageLinkItems = useCallback(
    async (query: string) => {
      const rows = await searchPagesForLink(query, { excludeId: pageId, limit: 15 });
      return rows.map((row) => ({
        title: row.title,
        subtext: "Open page",
        icon: pageLinkMenuIcon,
        onItemClick: () => {
          editor.createLink(`/app/${row.id}`, row.title);
        },
      }));
    },
    [editor, pageId, pageLinkMenuIcon],
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-end px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
        {saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved"
            : saveState === "error"
              ? "Save failed"
              : null}
      </div>
      {saveState === "error" && errorText ? (
        <div className="px-3 pb-2 text-xs text-red-700 dark:text-red-300">{errorText}</div>
      ) : null}
      <div className="px-3 pb-4">
        <BlockNoteView editor={editor} slashMenu={false} tableHandles>
          <SuggestionMenuController
            triggerCharacter="/"
            shouldOpen={(tr: Transaction) =>
              !tr.selection.$from.parent.type.isInGroup("tableContent")
            }
            getItems={getSlashItems}
          />
          <SuggestionMenuController
            triggerCharacter="@"
            shouldOpen={(tr: Transaction) =>
              !tr.selection.$from.parent.type.isInGroup("tableContent")
            }
            getItems={getPageLinkItems}
          />
        </BlockNoteView>
      </div>
    </div>
  );
}
