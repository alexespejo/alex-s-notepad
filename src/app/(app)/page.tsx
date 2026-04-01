import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Select a page in the sidebar
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Or create one with the “+” button.
        </p>
        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
          Tip: after you create a page, click it to open{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">
            /app/&lt;pageId&gt;
          </code>
          .
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          If the sidebar shows an error, make sure you ran the SQL in{" "}
          <Link
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Supabase
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

