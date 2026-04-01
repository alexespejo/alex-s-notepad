import { create } from "zustand";
import type { PageNode } from "@/lib/pages";

function walkTree(nodes: PageNode[], acc: Record<string, string>) {
  for (const n of nodes) {
    acc[n.id] = n.title;
    walkTree(n.children, acc);
  }
}

type PageTitlesState = {
  titlesByPageId: Record<string, string>;
  setPageTitle: (pageId: string, title: string) => void;
  replaceTitlesFromTree: (roots: PageNode[]) => void;
};

export const usePageTitlesStore = create<PageTitlesState>((set) => ({
  titlesByPageId: {},
  setPageTitle: (pageId, title) =>
    set((s) => ({
      titlesByPageId: { ...s.titlesByPageId, [pageId]: title },
    })),
  replaceTitlesFromTree: (roots) => {
    const acc: Record<string, string> = {};
    walkTree(roots, acc);
    set({ titlesByPageId: acc });
  },
}));
