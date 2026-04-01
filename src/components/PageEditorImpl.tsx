"use client";

import "@blocknote/core/fonts/inter.css";
import {
 insertOrUpdateBlockForSlashMenu,
 filterSuggestionItems,
} from "@blocknote/core/extensions";
import {
 useCreateBlockNote,
 SuggestionMenuController,
 getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { EditorView } from "@tiptap/pm/view";
import type { Transaction } from "@tiptap/pm/state";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiFileAddLine, RiLinkM } from "react-icons/ri";

import { equationSlashMenuIcon } from "@/components/blocks/EquationBlock";
import { appBlockNoteSchema } from "@/lib/blockNoteSchema";
import { usePageTitlesStore } from "@/lib/page-titles-store";
import { createPage, searchPagesForLink, updatePageContent } from "@/lib/pages";
import { reconcileSubpageLinksInEditor } from "@/lib/subpage-link-sync";
import {
 resolveImageUrlForEditor,
 uploadEditorImageForPage,
} from "@/lib/storage";
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

const SINGLE_LINE_HTTP_URL = /^https?:\/\/[^\s]+$/i;

function isSingleLineUrlPaste(plain: string): boolean {
 if (plain.includes("\n") || plain.includes("\r")) return false;
 return SINGLE_LINE_HTTP_URL.test(plain);
}

const APP_PAGE_PATH = /^\/app\/[^/]+$/;

function handleAppLinkClick(
 view: EditorView,
 event: MouseEvent,
 navigate: (path: string) => void,
): boolean {
 if (event.button !== 0) return false;
 if (event.metaKey || event.ctrlKey) return false;
 const target = event.target;
 if (!(target instanceof HTMLElement)) return false;
 const link = target.closest("a");
 if (!link || !view.dom.contains(link)) return false;
 const href = link.getAttribute("href");
 if (!href) return false;
 try {
  const url = new URL(href, window.location.origin);
  if (APP_PAGE_PATH.test(url.pathname)) {
   event.preventDefault();
   navigate(url.pathname);
   return true;
  }
 } catch {
  return false;
 }
 return false;
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
 const router = useRouter();
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
   pasteHandler: ({ event, editor: bnEditor, defaultPasteHandler }) => {
    const inCodeBlock = bnEditor.transact(
     (tr) =>
      tr.selection.$from.parent.type.spec.code &&
      tr.selection.$to.parent.type.spec.code,
    );
    if (!inCodeBlock) {
     const html = event.clipboardData?.getData("text/html")?.trim() ?? "";
     const plain = event.clipboardData?.getData("text/plain")?.trim() ?? "";
     if (html.length === 0 && isSingleLineUrlPaste(plain)) {
      bnEditor.createLink(plain, plain);
      return true;
     }
    }
    return defaultPasteHandler({ prioritizeMarkdownOverHTML: false });
   },
   _tiptapOptions: {
    editorProps: {
     handleClick(view, _pos, event) {
      return handleAppLinkClick(view, event, router.push);
     },
    },
   },
  },
  [pageId, initialBlocks, router],
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

 /** Keep link text in sync with sidebar/title renames for direct child pages only. */
 useEffect(() => {
  const prevKeyRef = { current: "" };
  const run = () => {
   const state = usePageTitlesStore.getState();
   const children = state.childIdsByParentId[pageId] ?? [];
   const key = children
    .map((id) => `${id}:${state.titlesByPageId[id] ?? ""}`)
    .join("|");
   if (key === prevKeyRef.current) return;
   prevKeyRef.current = key;
   reconcileSubpageLinksInEditor(editor, pageId);
  };
  run();
  return usePageTitlesStore.subscribe(run);
 }, [editor, pageId]);

 const pageLinkMenuIcon = useMemo(() => <RiLinkM size={18} />, []);

 const getPageLinkSuggestionItems = useCallback(
  async (query: string) => {
   const rows = await searchPagesForLink(query, {
    excludeId: pageId,
    limit: 15,
   });
   return rows.map((row) => ({
    title: row.title,
    subtext: "Go to page",
    icon: pageLinkMenuIcon,
    onItemClick: () => {
     editor.createLink(`/app/${row.id}`, row.title);
    },
   }));
  },
  [editor, pageId, pageLinkMenuIcon],
 );

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
   const subpageItem = {
    title: "Subpage",
    subtext: "Add a link here, create child page, then open it",
    aliases: ["child", "nested", "subpage", "sub-page"],
    icon: <RiFileAddLine size={18} />,
    onItemClick: () => {
     void (async () => {
      try {
       const page = await createPage({ parent_id: pageId });
       usePageTitlesStore.getState().registerChildUnderParent(pageId, page.id);
       usePageTitlesStore.getState().setPageTitle(page.id, page.title);
       editor.createLink(`/app/${page.id}`, page.title);
       await updatePageContent(pageId, editor.document as unknown as Json);
       router.push(`/app/${page.id}`);
      } catch (e) {
       setErrorText(
        e instanceof Error ? e.message : "Failed to create subpage",
       );
      }
     })();
    },
   };

   const q = query.trim();
   const linkLimit = q.length === 0 ? 5 : 15;
   const linkRows = await searchPagesForLink(q, {
    excludeId: pageId,
    limit: linkLimit,
   });
   const slashLinkItems = linkRows.map((row) => ({
    title: `Link: ${row.title}`,
    subtext: "Go to page",
    aliases: [row.title.toLowerCase()],
    icon: pageLinkMenuIcon,
    onItemClick: () => {
     editor.createLink(`/app/${row.id}`, row.title);
    },
   }));

   return filterSuggestionItems(
    [...defaults, equationItem, subpageItem, ...slashLinkItems],
    query,
   );
  },
  [editor, pageId, pageLinkMenuIcon, router],
 );

 /** Match app shell (`dark:bg-black` / `bg-white`); BlockNote defaults to #1f1f1f in dark mode. */
 const blockNoteThemeMatchingShell = useMemo(
  (): { light: Theme; dark: Theme } => ({
   light: {
    colors: {
     editor: { background: "#ffffff" },
     menu: { background: "#ffffff" },
    },
   },
   dark: {
    colors: {
     editor: { background: "#000000" },
     menu: { background: "#000000" },
    },
   },
  }),
  [],
 );

 const suggestionShouldOpen = useCallback((tr: Transaction) => {
  return !tr.selection.$from.parent.type.isInGroup("tableContent");
 }, []);

 return (
  <div className="bg-white dark:bg-black">
   <div className="flex items-center justify-end px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
    {saveState === "saving"
     ? "Saving…"
     : saveState === "saved"
       ? "Saved"
       : saveState === "error"
         ? "Save failed"
         : null}
   </div>
   {errorText ? (
    <div className="px-3 pb-2 text-xs text-red-700 dark:text-red-300">
     {errorText}
    </div>
   ) : null}
   <BlockNoteView
    editor={editor}
    theme={blockNoteThemeMatchingShell}
    slashMenu={false}
    tableHandles
   >
    <SuggestionMenuController
     triggerCharacter="/"
     shouldOpen={suggestionShouldOpen}
     getItems={getSlashItems}
    />
    <SuggestionMenuController
     triggerCharacter="@"
     shouldOpen={suggestionShouldOpen}
     getItems={getPageLinkSuggestionItems}
    />
    <SuggestionMenuController
     triggerCharacter="[["
     shouldOpen={suggestionShouldOpen}
     getItems={getPageLinkSuggestionItems}
    />
   </BlockNoteView>
  </div>
 );
}
