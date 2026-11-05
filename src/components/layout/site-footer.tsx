import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FOOTER_COLUMNS } from "@/lib/navigation";

export function SiteFooter() {
  return (
    <footer className="bg-black px-4 pt-10 pb-6 text-rez-full-white md:px-8 md:pt-14 md:pb-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-[340px] flex-col gap-7">
            <Link href="/" aria-label="Rezide home" className="text-rez-full-white">
              <Logo height={30} />
            </Link>
            <p className="text-[17px] leading-normal text-pretty text-rez-steel">
              The only place for you to browse 100% trusted and authentic properties.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-24 gap-y-10">
            {FOOTER_COLUMNS.map((col, i) => (
              <ul key={i} className="flex min-w-[150px] flex-col gap-5">
                {col.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href} className="text-base font-medium hover:text-rez-mocaccino">
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-base font-medium text-rez-space" title="Content not yet published">
                        {link.label}
                        <span className="sr-only"> (coming soon)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center text-sm text-rez-steel">
          <p>© 2026 Rezide. All rights reserved.</p>
          <p className="text-xs text-rez-space">
            Prototype build: listings, realtors and prices shown are sample data.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** One-line footer for the customer workspace (account, listing wizard), as in the prototype. */
export function SlimFooter() {
  return (
    <footer className="bg-black px-4 py-6 text-sm text-rez-full-white md:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p>© 2026 Rezide. Powering India&apos;s Leading Realtors.</p>
        <p className="text-rez-steel">Customer account · sample data</p>
      </div>
    </footer>
  );
}
