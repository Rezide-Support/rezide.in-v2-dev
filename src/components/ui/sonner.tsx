"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Toasts in the Rezide light treatment: black text on white, 20px radius.
 * Every toast has a close button (top-right). Sonner stacks toasts and expands
 * the stack into a list on hover or focus (its default, `expand={false}`).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--rez-white)",
          "--normal-text": "var(--rez-black)",
          "--normal-border": "var(--rez-smoke)",
          "--border-radius": "20px",
          // Close button in the top-right corner instead of Sonner's top-left.
          "--toast-close-button-start": "unset",
          "--toast-close-button-end": "0",
          "--toast-close-button-transform": "translate(35%, -35%)",
        } as React.CSSProperties
      }
      closeButton
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        classNames: {
          toast: "cn-toast font-sans",
          closeButton:
            "!size-6 !border-rez-smoke !bg-white !text-black hover:!border-black hover:!bg-white focus-visible:!ring-2 focus-visible:!ring-rez-mocaccino/60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
