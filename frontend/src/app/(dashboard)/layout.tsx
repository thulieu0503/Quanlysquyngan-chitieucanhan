import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AppNavbar } from "@/components/layout/AppNavbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-ink flex flex-col font-sans">
      <AppNavbar user={user} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

