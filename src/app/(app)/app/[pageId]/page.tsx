import { notFound } from "next/navigation";
import { getPageByIdForUser } from "@/lib/pages-server";
import { PageEditor } from "@/components/PageEditor";

export default async function PageView({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const page = await getPageByIdForUser(pageId);

  if (!page) notFound();

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
      <PageEditor key={page.id} pageId={page.id} initialContent={page.content} />
    </div>
  );
}

