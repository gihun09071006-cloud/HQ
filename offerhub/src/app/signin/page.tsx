import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authOptions, getServerAuthSession } from "@/lib/auth";

import { SignInPanel } from "./SignInPanel";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect("/");

  const providers = authOptions.providers
    .filter((p) => p.id !== "email")
    .map((p) => ({ id: p.id, name: p.name }));
  const emailEnabled = authOptions.providers.some((p) => p.id === "email");

  return (
    <div className="page flex justify-center py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-2xl font-semibold tracking-tight">
          Sign in to Offer<span className="text-primary">Hub</span>
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Save favorites, track what you&apos;ve viewed, pick up where you left off.
        </p>
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <SignInPanel providers={providers} emailEnabled={emailEnabled} />
        </div>
      </div>
    </div>
  );
}
