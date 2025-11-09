"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <>
      <div className="flex min-h-[calc(100dvh-3rem)] w-full items-center justify-center overflow-hidden bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-lg font-semibold text-foreground">Loading...</p>
        </div>
      </div>
    </>
  );
}
