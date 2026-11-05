import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Fills its (relatively positioned) parent. Uses next/image with responsive sizes.
 * `priority` marks an above-the-fold image (a likely Largest Contentful Paint):
 * it loads eagerly with high fetch priority, as Next 16 recommends in place of
 * the deprecated `priority` / `preload` props.
 */
export function CoverImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={70}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      className={cn("object-cover", className)}
    />
  );
}
