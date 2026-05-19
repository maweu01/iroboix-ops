import * as React from "react"
import { cn } from "../lib/utils"

function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "success" | "warning" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        {
          "border-transparent bg-slate-100 text-slate-600 tracking-tight dark:bg-slate-800 dark:text-slate-300": variant === "default",
          "border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400": variant === "success",
          "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
