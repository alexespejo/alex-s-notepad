"use client";

import { RiAddLine } from "react-icons/ri";

export function NewPageButton({
 label = "New page",
 onClick,
}: {
 label?: string;
 onClick: () => void;
}) {
 return (
  <button
   type="button"
   onClick={onClick}
   className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
  >
   <RiAddLine className="shrink-0" size={18} aria-hidden />
   {label}
  </button>
 );
}
