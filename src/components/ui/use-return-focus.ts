"use client"

import * as React from "react"

type FocusEventHandler = (event: Event) => void

/**
 * Radix returns focus on close only to a `<DialogTrigger>`. Many dialogs here are
 * opened from state (filter buttons, credential pills, menu items), so focus fell
 * back to <body>. This remembers what had focus when the dialog opened and returns
 * there on close, unless the caller handles `onCloseAutoFocus` itself.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  onOpenAutoFocus?: FocusEventHandler
  onCloseAutoFocus?: FocusEventHandler
}) {
  const returnTo = React.useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      const el = returnTo.current
      returnTo.current = null
      if (el?.isConnected) {
        event.preventDefault()
        el.focus()
      }
    },
  }
}
