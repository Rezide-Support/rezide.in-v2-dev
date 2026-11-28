"use client";

import { Children, isValidElement, type ComponentProps } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"select">, "size" | "onChange" | "value"> & {
  value: string | number;
  onValueChange: (value: string) => void;
  size?: "sm" | "md";
};

/** Branded, keyboard-accessible picker for the property search toolbar. */
export function SearchSelect({ value, onValueChange, size = "md", className, children, id, disabled, name, "aria-label": ariaLabel }: Props) {
  return (
    <Select value={String(value)} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "w-auto min-w-20 gap-6 rounded-full border-rez-smoke bg-white pr-[18px] pl-[18px] font-semibold text-black shadow-none transition-[border-color,box-shadow] hover:border-black focus-visible:border-rez-mocaccino focus-visible:shadow-[var(--ring-focus)] focus-visible:ring-0 data-[state=open]:border-rez-mocaccino [&_svg]:text-black",
          size === "sm" ? "data-[size=default]:h-10" : "data-[size=default]:h-12",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className="min-w-[max(10rem,var(--radix-select-trigger-width))] rounded-2xl border border-rez-smoke bg-white p-2 font-sans text-black shadow-rez-md ring-0 [--spacing:0.25rem] [&_[data-position=popper]]:min-w-0! [&_[data-position=popper]]:w-full [&_[data-slot=select-item]+[data-slot=select-item]]:mt-1.5"
      >
        {Children.map(children, (child) => {
          if (!isValidElement<ComponentProps<"option">>(child)) return null;
          return (
            <SelectItem
              value={String(child.props.value)}
              disabled={child.props.disabled}
              className="min-h-11 cursor-pointer rounded-xl py-2.5 pr-9 pl-3.5 text-sm font-medium focus:bg-rez-cloud focus:text-black data-[state=checked]:bg-rez-cream data-[state=checked]:font-semibold data-[state=checked]:text-black"
            >
              {child.props.children}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
