import * as React from "react"
import { cn } from "cn"

/** Rezide field: pill-shaped, smoke border, mocaccino focus ring. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[50px] w-full min-w-0 rounded-full border border-rez-smoke bg-white px-[18px] text-[15px] font-medium text-black transition-[border-color,box-shadow] outline-none placeholder:font-normal placeholder:text-[#767a88] focus-visible:border-rez-mocaccino focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-rez-cloud disabled:opacity-70 aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_rgba(155,28,49,0.25)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
