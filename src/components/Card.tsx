import * as React from "react"
import { cn } from "../lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50", className)} {...props} />
))
Card.displayName = "Card"

export { Card }
