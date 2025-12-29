import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Sidebar from "@/components/layout/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[var(--sinvello-background)]">
      <Sidebar user={session.user} />
      <main className="lg:ml-72 min-h-screen">
        {children}
      </main>
    </div>
  )
}
