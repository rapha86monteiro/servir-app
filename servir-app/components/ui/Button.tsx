"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500": variant === "primary",
          "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400": variant === "secondary",
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500": variant === "danger",
          "text-gray-600 hover:bg-gray-100 focus:ring-gray-400": variant === "ghost",
          "px-2.5 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
