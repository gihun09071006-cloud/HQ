"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  offerId: string;
  initialFavorited?: boolean;
  className?: string;
}

export function FavoriteButton({ offerId, initialFavorited = false, className }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      if (res.status === 401) {
        setFavorited(!next);
        router.push("/signin");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { favorited: boolean };
      setFavorited(data.favorited);
      startTransition(() => router.refresh());
    } catch {
      setFavorited(!next); // revert on failure
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "rounded-full border border-border/60 bg-background/70 p-1.5 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary",
        favorited ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      <Heart className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
