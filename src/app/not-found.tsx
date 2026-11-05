import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 bg-rez-cloud px-4 py-24 text-center">
      <Link href="/" aria-label="Rezide home">
        <Logo height={28} />
      </Link>
      <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] md:text-[44px]">We couldn’t find that page.</h1>
      <p className="max-w-md text-[15px] text-rez-graphite">
        The listing may have been removed, or the link is incorrect.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/properties">Browse properties</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
