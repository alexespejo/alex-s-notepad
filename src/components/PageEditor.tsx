"use client";

import dynamic from "next/dynamic";
import type { Json } from "@/lib/supabase/types";

export const PageEditor = dynamic(() => import("./PageEditorImpl"), {
  ssr: false,
});

export type PageEditorProps = {
  pageId: string;
  initialContent: Json;
  debounceMs?: number;
};

