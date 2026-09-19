import { auth } from "@clerk/nextjs/server";
import { Building2 } from "lucide-react";
import { getDocumentsAction } from "@/lib/actions/documents";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";

export default async function DocumentsPage() {
  const { orgId } = auth();

  if (!orgId) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12 flex flex-col items-center gap-6">
        <Building2 className="h-16 w-16 text-indigo-400 opacity-20" />
        <h2 className="text-xl font-semibold text-white">Select an organization to access documents.</h2>
      </div>
    );
  }

  const res = await getDocumentsAction();
  const initialDocs = res.success && res.documents ? res.documents : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Document Ingestion Pipeline</h1>
          <p className="text-zinc-400 mt-1">Upload files to extract, chunk, embed, and index for cited RAG search.</p>
        </div>
      </div>

      <DocumentUploader />
      <DocumentList initialDocuments={initialDocs} />
    </div>
  );
}
