import Link from "next/link";
import { LayoutDashboard, FileText, MessageSquare } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-zinc-900 bg-zinc-950">
        <div className="flex h-16 items-center px-6 border-b border-zinc-900 gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-sm shadow">
            DM
          </div>
          <span className="font-bold tracking-tight text-lg">DocuMind</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          <Link
            href="/app"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-zinc-400" />
            Dashboard
          </Link>
          <Link
            href="/app/documents"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <FileText className="h-4 w-4 text-zinc-400" />
            Documents
          </Link>
          <Link
            href="/app/chat"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            Chat Room
          </Link>
        </nav>

        {/* Footer / Tenant switcher */}
        <div className="p-4 border-t border-zinc-900 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 border border-zinc-800"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Profile Settings</p>
            </div>
          </div>
          <div className="w-full overflow-hidden bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/app"
              afterLeaveOrganizationUrl="/app"
              afterSelectOrganizationUrl="/app"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger: "w-full flex justify-between bg-zinc-900 text-zinc-300 hover:text-white border-0",
                  organizationPreview: "text-zinc-200"
                }
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden h-16 items-center justify-between px-6 border-b border-zinc-900 bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-sm shadow">
              DM
            </div>
            <span className="font-bold tracking-tight">DocuMind</span>
          </div>

          <div className="flex items-center gap-3">
            <OrganizationSwitcher
              afterSelectOrganizationUrl="/app"
              appearance={{
                elements: {
                  rootBox: "max-w-[150px]",
                  organizationSwitcherTrigger: "bg-zinc-900 text-zinc-300 border-0"
                }
              }}
            />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Inner Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-900/50 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
