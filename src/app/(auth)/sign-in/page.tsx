import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface LoginProps {
  searchParams: Promise<{ redirect?: string } & Partial<Record<string, string>>>;
}

export default async function SignInPage({ searchParams }: LoginProps) {
  const params = await searchParams;
  const redirectTo = params.redirect;

  // Show form-level message if present (success/error from redirect)
  const messageKeys = ["success", "error", "message"] as const;
  const messageKey = messageKeys.find((k) => k in params);
  const message = messageKey ? ({ [messageKey]: params[messageKey] } as Message) : null;

  if (message && messageKey !== "error") {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center p-4 sm:max-w-md">
        <FormMessage message={message} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="font-syne text-2xl font-bold text-foreground hover:text-primary transition-colors">
            ezledgr
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <form className="flex flex-col space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="font-syne text-3xl font-bold tracking-tight text-foreground">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  className="text-primary font-medium hover:underline transition-all"
                  href="/sign-up"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* Hidden redirect field — passed through to signInAction */}
            {redirectTo && (
              <input type="hidden" name="redirect" value={redirectTo} />
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="w-full bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Link
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-all"
                    href="/forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Your password"
                  required
                  className="w-full bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <SubmitButton
              className="w-full"
              pendingText="Signing in..."
              formAction={signInAction}
            >
              Sign in
            </SubmitButton>

            {message && <FormMessage message={message} />}
          </form>
        </div>
      </div>
    </div>
  );
}
