"use client";

import { createReactBlockSpec } from "@blocknote/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { RiFunctions } from "react-icons/ri";
function EquationBlockInner(props: {
  block: { id: string; props: { latex: string } };
  // BlockNote editor type is schema-generic; keep loose here for the inner component.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}) {
  const { block, editor } = props;
  const latex = block.props.latex;
  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(latex.trim() ? latex : "\\text{Math}", {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return "";
    }
  }, [latex]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
      <div
        className="overflow-x-auto px-3 py-3 text-zinc-900 dark:text-zinc-100"
        contentEditable={false}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
      <div className="border-t border-zinc-200 px-2 py-2 dark:border-zinc-700">
        <label className="sr-only" htmlFor={`latex-${block.id}`}>
          LaTeX
        </label>
        <textarea
          id={`latex-${block.id}`}
          className="min-h-16 w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={latex}
          placeholder="E = mc^2"
          onChange={(e) => {
            editor.updateBlock(block, {
              props: { latex: e.target.value },
            });
          }}
        />
      </div>
    </div>
  );
}

export const equationBlock = createReactBlockSpec(
  {
    type: "equation",
    propSchema: {
      latex: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => <EquationBlockInner {...props} />,
  },
);

export function equationSlashMenuIcon() {
  return <RiFunctions size={18} />;
}
