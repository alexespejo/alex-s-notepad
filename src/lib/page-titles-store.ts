import { create } from "zustand";
import type { PageNode } from "@/lib/pages";

function walkTree(nodes: PageNode[], acc: Record<string, string>) {
  for (const n of nodes) {
    acc[n.id] = n.title;
    walkTree(n.children, acc);
  }
}

function walkChildIds(nodes: PageNode[], acc: Record<string, string[]>) {
  for (const n of nodes) {
    acc[n.id] = n.children.map((c) => c.id);
    walkChildIds(n.children, acc);
  }
}

type PageTitlesState = {
  titlesByPageId: Record<string, string>;
  /** Direct child page ids per parent (for syncing subpage link labels in the editor). */
  childIdsByParentId: Record<string, string[]>;
  setPageTitle: (pageId: string, title: string) => void;
  replaceTitlesFromTree: (roots: PageNode[]) => void;
  registerChildUnderParent: (parentId: string, childId: string) => void;
};

export const usePageTitlesStore = create<PageTitlesState>((set) => ({
  titlesByPageId: {},
  childIdsByParentId: {},
  setPageTitle: (pageId, title) =>
    set((s) => ({
      titlesByPageId: { ...s.titlesByPageId, [pageId]: title },
    })),
  replaceTitlesFromTree: (roots) => {
    const titles: Record<string, string> = {};
    walkTree(roots, titles);
    const childIdsByParentId: Record<string, string[]> = {};
    walkChildIds(roots, childIdsByParentId);
    set({ titlesByPageId: titles, childIdsByParentId });
  },
  registerChildUnderParent: (parentId, childId) =>
    set((s) => {
      const existing = s.childIdsByParentId[parentId] ?? [];
      if (existing.includes(childId)) return s;
      return {
        childIdsByParentId: {
          ...s.childIdsByParentId,
          [parentId]: [...existing, childId],
        },
      };
    }),
}));
