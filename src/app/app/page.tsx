import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { FileText, MessageSquare, Building2, ShieldAlert, Sparkles, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { orgId } = auth();
  const user = await currentUser();

  // If the user has not selected an organization, prompt them to create or select one
  if (!orgId) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12 flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Building2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">No Organization Selected</h1>
          <p className="text-zinc-400 text-sm max-w-md">
            DocuMind requires an active organization to isolate document uploads and conversation histories securely.
          </p>
        </div>
        <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-xl flex items-start gap-3 max-w-md text-left">
          <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-500/90 leading-relaxed">
            Please use the organization switcher in the sidebar to select an existing workspace or create a new organization.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage your knowledge base and interact with your documents.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm text-zinc-400">
          <Database className="h-4 w-4 text-indigo-400" />
          <span>Org Scope: <strong className="text-zinc-200">{orgId}</strong></span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-zinc-500 mt-1">0% of free limits used</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-zinc-500 mt-1">Ready to chat</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Monthly Usage Limits</CardTitle>
            <Sparkles className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">0 / 50</div>
            <p className="text-xs text-zinc-500 mt-1">Queries resets in 15 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-white">Document Pipeline</CardTitle>
            <CardDescription className="text-zinc-400">
              Upload PDF, DOCX, or TXT documents. We will chunk them and generate embeddings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/app/documents" 
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Go to Upload
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-white">RAG Chat Room</CardTitle>
            <CardDescription className="text-zinc-400">
              Ask questions across your entire knowledge base or select specific documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/app/chat" 
              className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-800 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Start Chatting
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
