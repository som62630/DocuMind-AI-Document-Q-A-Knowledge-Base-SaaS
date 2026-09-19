import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <SignIn 
      path="/sign-in" 
      signUpUrl="/sign-up" 
      afterSignInUrl="/app"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          cardBox: "shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm normal-case",
        }
      }}
    />
  )
}
