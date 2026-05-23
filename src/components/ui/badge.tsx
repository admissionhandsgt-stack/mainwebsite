
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        medical: "border-transparent bg-medical-100 text-medical-800",
        success: "border-transparent bg-green-100 text-green-800",
        warning: "border-transparent bg-yellow-100 text-yellow-800",
        info: "border-transparent bg-blue-100 text-blue-800",
        premium: "border-transparent bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900",
        modern: "border-transparent bg-gradient-to-r from-medical-50 to-blue-100 text-medical-700 font-medium",
        purple: "border-transparent bg-purple-100 text-purple-800",
        indigo: "border-transparent bg-indigo-100 text-indigo-800",
        teal: "border-transparent bg-teal-100 text-teal-800",
        pink: "border-transparent bg-pink-100 text-pink-800",
        amber: "border-transparent bg-amber-100 text-amber-800",
        cyan: "border-transparent bg-cyan-100 text-cyan-800",
        rose: "border-transparent bg-rose-100 text-rose-800",
        emerald: "border-transparent bg-emerald-100 text-emerald-800",
        violet: "border-transparent bg-violet-100 text-violet-800",
        fuchsia: "border-transparent bg-fuchsia-100 text-fuchsia-800",
        lime: "border-transparent bg-lime-100 text-lime-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
