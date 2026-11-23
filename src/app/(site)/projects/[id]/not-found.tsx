import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * Shown when a project id doesn't exist. Same look as the site-wide 404, but with project wording,
 * and a <div>: it renders inside the site layout's <main>, so it mustn't add a second one.
 * The status stays 200 because the page streams before the project is checked; Next.js adds
 * <meta name="robots" content="noindex"> so search engines don't index it.
 */
export default function ProjectNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-rez-cloud px-4 py-24 text-center">
      <Link href="/" aria-label="Rezide home">
        <Logo height={28} />
      </Link>
      <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] md:text-[44px]">We couldn’t find that page.</h1>
      <p className="max-w-md text-[15px] text-rez-graphite">This project may have been removed, or the link is incorrect.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/projects">Browse projects</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
