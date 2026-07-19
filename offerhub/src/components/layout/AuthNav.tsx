"use client";

import { Heart, History, LogOut, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthNavProps {
  user: { name: string | null; image: string | null; role: "USER" | "ADMIN" } | null;
}

export function AuthNav({ user }: AuthNavProps) {
  if (!user) {
    return (
      <Link href="/signin" className={cn(buttonVariants({ size: "sm" }))}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/favorites"
        title="Favorites"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
      >
        <Heart className="h-4 w-4" />
      </Link>
      <Link
        href="/history"
        title="History"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
      >
        <History className="h-4 w-4" />
      </Link>
      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          title="Admin panel"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
        >
          <Shield className="h-4 w-4" />
        </Link>
      )}
      <div className="ml-2 flex items-center gap-2">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Account"}
            width={26}
            height={26}
            className="rounded-full border border-border"
          />
        ) : (
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-border bg-secondary font-mono text-[11px]">
            {(user.name ?? "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
