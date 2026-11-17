import Link from "next/link";
import Image from "next/image";
import { FOOTER_COLUMNS } from "@/lib/navigation";

/** Shared Figma footer for every public page. */
export function SiteFooter() {
  return (
    <footer className="bg-black px-5 py-10 text-white sm:px-8 lg:px-[60px] lg:py-20">
      <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[minmax(260px,317px)_minmax(0,756px)] lg:justify-between lg:gap-12">
        <div className="flex max-w-[317px] flex-col gap-3 text-sm font-medium text-[#afafaf] sm:text-base">
          <Link href="/" aria-label="Rezide home" className="block w-fit">
            <Image src="/images/footer-logo.png" alt="Rezide" width={251} height={66} className="h-auto w-[251px] max-w-full" />
          </Link>
          <p className="leading-normal">The only place for you to browse 100% trusted and authentic properties.</p>
          <p className="leading-normal">© 2026 Rezide. All rights reserved.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:gap-x-20">
          {FOOTER_COLUMNS.map((column, index) => (
            <ul key={index} className="flex min-w-0 flex-col gap-2.5 text-sm font-medium sm:text-base lg:p-2.5">
              {column.map(link => (
                <li key={link.label} className="leading-normal">
                  {link.href ? (
                    <Link href={link.href} className="hover:text-rez-mocaccino">{link.label}</Link>
                  ) : (
                    <span title="Content not yet published">{link.label}<span className="sr-only"> (coming soon)</span></span>
                  )}
                </li>
              ))}
            </ul>
          ))}
        </nav>
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
