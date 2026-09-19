import Link from "next/link";
import { ArrowRight, FileText, ShieldAlert, Sparkles, MessageSquare } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export default function Home() {
  const { userId } = auth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950" />
      <div 
        className="absolute inset-0 -z-10 opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold shadow-md">
              DM
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              DocuMind
            </span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
            <a href="https://github.com" target="_blank" className="transition-colors hover:text-white">Documentation</a>
          </nav>

          <div className="flex items-center gap-4">
            {userId ? (
              <Link 
                href="/app" 
                className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/sign-in" 
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  Sign In
                </Link>
                <Link 
                  href="/sign-up" 
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-medium text-white transition-all hover:opacity-90 shadow-lg shadow-indigo-600/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-32">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm font-medium text-indigo-400 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>Introducing Custom RAG Context Windows</span>
          </div>

          <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Your Documents Have Answers. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
              DocuMind Unlocks Them.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            Upload PDFs, DOCX, and text files. Ask complex questions and receive immediate, cited answers. Isolated and structured securely for your organization.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <Link 
              href={userId ? "/app" : "/sign-up"}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 font-semibold text-zinc-950 transition-all hover:bg-zinc-200 shadow-xl"
            >
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a 
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 font-semibold text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-zinc-900 bg-zinc-950/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold uppercase tracking-wider text-indigo-500">Intelligent RAG Architecture</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for Production-Grade Document QA
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm">
                <dt className="flex items-center gap-x-3 text-lg font-semibold text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  Semantic Chunking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base text-zinc-400 leading-relaxed">
                  We recursively parse and split files with 15% context overlaps. No truncated sentences or lost logic between chunks.
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm">
                <dt className="flex items-center gap-x-3 text-lg font-semibold text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  Citation-Grounded Chats
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base text-zinc-400 leading-relaxed">
                  Every paragraph generated links back to its exact source chunk, document title, and page number for absolute traceablity.
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 backdrop-blur-sm">
                <dt className="flex items-center gap-x-3 text-lg font-semibold text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  Multi-Tenant Security
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base text-zinc-400 leading-relaxed">
                  Database Row-Level Security ensures document uploads and conversation histories are only accessible inside your workspace.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-zinc-900 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold uppercase tracking-wider text-indigo-500">Flexible Pricing</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pricing Plans for Teams of All Sizes
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-3xl border border-zinc-950 bg-zinc-900/10 p-8 shadow-xl xl:p-10">
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold text-white">Free Sandbox</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">Perfect for exploring the RAG pipeline and basic file queries.</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-white">$0</span>
                  <span className="text-sm font-semibold leading-6 text-zinc-400">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-zinc-300">
                  <li className="flex gap-x-3">✓ Up to 5 Documents</li>
                  <li className="flex gap-x-3">✓ 50 Chat Queries / Month</li>
                  <li className="flex gap-x-3">✓ Standard Cosine Similarity Search</li>
                  <li className="flex gap-x-3">✓ Basic Citation Previews</li>
                </ul>
              </div>
              <Link 
                href={userId ? "/app" : "/sign-up"}
                className="mt-8 block rounded-xl bg-zinc-800 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="flex flex-col justify-between rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-zinc-900/20 p-8 shadow-xl xl:p-10 relative">
              <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold text-white">Pro Workspace</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">Unlimited searches, priority job queue, and full team settings.</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-white">$19</span>
                  <span className="text-sm font-semibold leading-6 text-zinc-400">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-zinc-300">
                  <li className="flex gap-x-3 text-indigo-400">✓ Unlimited Uploads</li>
                  <li className="flex gap-x-3">✓ Unlimited Queries</li>
                  <li className="flex gap-x-3">✓ Advanced Chunk Metadata + Overlap</li>
                  <li className="flex gap-x-3">✓ Multi-member Org Workspace Access</li>
                  <li className="flex gap-x-3">✓ Priority Async Ingestion Queue</li>
                </ul>
              </div>
              <Link 
                href={userId ? "/app" : "/sign-up"}
                className="mt-8 block rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} DocuMind Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
