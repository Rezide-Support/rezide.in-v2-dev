import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Rezide button. Tones and sizes follow the prototype's design-system Button:
 * pill radius, semibold Montserrat, black primary with Arsenic hover,
 * press-scale feedback and a mocaccino focus ring.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border font-semibold tracking-[0.01em] whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 ease-rez outline-none select-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/45 focus-visible:outline-none active:not-disabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-black bg-black text-rez-full-white hover:bg-rez-arsenic hover:border-rez-arsenic",
        secondary: "border-black bg-transparent text-black hover:bg-black/[0.06]",
        outline: "border-rez-smoke bg-white text-black hover:border-black",
        ghost: "border-transparent bg-transparent text-black hover:bg-black/[0.06]",
        inverse: "border-rez-full-white bg-rez-full-white text-black hover:bg-white hover:border-white",
        warm: "border-rez-mocaccino bg-rez-mocaccino text-black hover:bg-[#b79470]",
        feature: "border-rez-timber bg-rez-timber text-rez-full-white hover:bg-rez-timber-tint",
        announce: "border-rez-burgundy bg-rez-burgundy text-rez-full-white hover:bg-[#4b0a20]",
        destructive: "border-destructive bg-white text-destructive hover:bg-destructive/[0.06]",
        link: "h-auto border-transparent bg-transparent px-0 text-rez-mocaccino-ink underline underline-offset-4 hover:text-black",
      },
      size: {
        sm: "h-8 gap-1.5 px-4 text-xs [&_svg:not([class*='size-'])]:size-4",
        default: "h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-5",
        lg: "h-12 gap-2.5 px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        xl: "h-[54px] gap-2.5 px-8 text-base [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-5",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
