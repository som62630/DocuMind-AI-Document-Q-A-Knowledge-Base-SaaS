import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Visual / Branding Side */}
      <div className="relative hidden items-center justify-center bg-zinc-950 p-10 text-white lg:flex">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950" />
        <div 
          className="absolute inset-0 opacity-30" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(63 63 70) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-20 flex max-w-lg flex-col gap-6">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg">
              DM
            </div>
            <span>DocuMind</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Decentralize Knowledge. Query Directly.
            </h2>
            <p className="text-zinc-400 leading-relaxed text-lg">
              DocuMind empowers organizations to unlock insights from PDFs, Word docs, and txt files using advanced, cited Retrieval-Augmented Generation (RAG).
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-zinc-800 pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200">Organization-Scoped Isolation</h4>
                <p className="text-sm text-zinc-400">Strict Row-Level Security keeps data safe and isolated per organization.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200">Traceable Citations</h4>
                <p className="text-sm text-zinc-400">Every response is bound to source documents, page numbers, and exact excerpts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center bg-zinc-900 p-8 lg:bg-zinc-950/20">
        <div className="w-full max-w-md space-y-8 flex flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  )
}
