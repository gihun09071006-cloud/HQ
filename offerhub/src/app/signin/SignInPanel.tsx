"use client";

import { Mail, Wallet } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignInPanelProps {
  providers: { id: string; name: string }[];
  emailEnabled: boolean;
}

export function SignInPanel({ providers, emailEnabled }: SignInPanelProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    await signIn("email", { email, redirect: false, callbackUrl: "/" });
    setSending(false);
    setSent(true);
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <Button
          key={p.id}
          variant="secondary"
          className="w-full justify-center"
          onClick={() => signIn(p.id, { callbackUrl: "/" })}
        >
          Continue with {p.name}
        </Button>
      ))}

      {emailEnabled && (
        <>
          {providers.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {sent ? (
            <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-center text-sm text-primary">
              Check your inbox — we sent a magic link to {email}.
            </p>
          ) : (
            <form onSubmit={onEmailSubmit} className="space-y-2">
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <Button type="submit" className="w-full" disabled={sending}>
                <Mail className="h-4 w-4" />
                {sending ? "Sending link…" : "Continue with email"}
              </Button>
            </form>
          )}
        </>
      )}

      {providers.length === 0 && !emailEnabled && (
        <p className="rounded-md border border-border bg-card p-3 text-center text-sm text-muted-foreground">
          No auth providers configured yet. Add Google/Discord/Email credentials to{" "}
          <code className="font-mono text-xs">.env</code> — see README.
        </p>
      )}

      <button
        type="button"
        disabled
        title="WalletConnect lands after MVP"
        className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground opacity-70"
      >
        <Wallet className="h-4 w-4" />
        Wallet sign-in — coming soon
      </button>
    </div>
  );
}
