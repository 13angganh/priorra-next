"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * Pure UI primitive — no domain knowledge (Architecture Proposal
 * section 2). Development Phase #30.
 *
 * Scale-down tap feedback (active:0.96) is the single biggest
 * contributor to a native "premium app" feel — its absence is what
 * makes web UI read as web UI.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20 hover:brightness-110",
  secondary:
    "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
  ghost:
    "bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[13px] px-3.5 py-1.5 rounded-full",
  md: "text-sm px-5 py-2.5 rounded-full",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.1 }}
        disabled={disabled}
        className={`font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...(props as HTMLMotionProps<"button">)}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
