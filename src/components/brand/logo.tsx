import { cn } from "@/lib/utils";
import { MARK, WORDMARK } from "./icon-data";

type LogoProps = {
  variant?: "wordmark" | "mark";
  /** Height in px. Width follows the artwork's aspect ratio. */
  height?: number;
  className?: string;
};

/**
 * Rezide wordmark. The logotype (Rexton) is licensed and not bundled,
 * so the wordmark ships as vector art, exactly as in the prototype.
 */
export function Logo({ variant = "wordmark", height = 24, className }: LogoProps) {
  const art = variant === "mark" ? MARK : WORDMARK;
  const ratio = variant === "mark" ? 1.4 : 6.93;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={art.viewBox}
      height={height}
      width={Math.round(height * ratio)}
      fill="currentColor"
      role="img"
      aria-label="Rezide"
      className={cn("block", className)}
      dangerouslySetInnerHTML={{ __html: `<title>Rezide</title>${art.body}` }}
    />
  );
}
