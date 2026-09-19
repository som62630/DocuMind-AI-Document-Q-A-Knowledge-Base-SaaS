import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <SignUp 
      path="/sign-up" 
      signInUrl="/sign-in" 
      afterSignUpUrl="/app"
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
