'use client';

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type MotionCardProps = HTMLAttributes<HTMLDivElement>;

export function MotionCard({ className, children, ...props }: MotionCardProps) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl transition-all duration-300",
        "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-white/10 before:to-white/0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}
