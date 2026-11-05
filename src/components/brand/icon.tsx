import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { ICONS, type IconName } from "./icon-data";

export type { IconName };

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  /** Pixel size or any CSS length. Defaults to 20px. */
  size?: number | string;
  /** Accessible label. When omitted the icon is decorative and hidden from assistive tech. */
  title?: string;
};

/** Rezide brand icon (32×32 grid, inherits currentColor). Rendered inline so it works in Server Components. */
export function Icon({ name, size = 20, title, className, ...rest }: IconProps) {
  const icon = ICONS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("inline-block shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: icon.body }}
      {...rest}
    />
  );
}
