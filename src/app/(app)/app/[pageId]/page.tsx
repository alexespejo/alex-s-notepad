import { notFound } from "next/navigation";
import { EditablePageTitle } from "@/components/EditablePageTitle";
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
      <EditablePageTitle pageId={page.id} initialTitle={page.title} />
      <PageEditor key={page.id} pageId={page.id} initialContent={page.content} />
    </div>
  );
}

