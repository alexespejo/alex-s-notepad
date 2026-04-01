import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="min-h-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}

