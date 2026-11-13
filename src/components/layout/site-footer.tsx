import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/brand/logo";
import { FOOTER_COLUMNS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Site footer. On phones it follows the Figma layout (two link columns). `realtorMobile`
 * is the Realtor Corner's phone variant: its own logo artwork, spacing and colours,
 * applied on top of the default (later classes win in `cn`).
 */
export function SiteFooter({ realtorMobile = false }: { realtorMobile?: boolean }) {
  return (
    <footer className={cn("bg-black px-5 pt-8 pb-6 text-rez-full-white md:px-8 md:pt-14 md:pb-8", realtorMobile && "max-sm:pt-6")}>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 max-sm:gap-9">
        <div className={cn("flex flex-wrap justify-between gap-10", realtorMobile && "max-sm:gap-4")}>
          <div className={cn("flex max-w-[340px] flex-col gap-7 max-sm:max-w-[250px] max-sm:gap-4", realtorMobile && "max-sm:max-w-none max-sm:gap-1")}>
            <Link href="/" aria-label="Rezide home" className="text-rez-full-white">
              {realtorMobile ? (
                <>
                  <span className="relative block h-[66px] w-[229px] max-w-full overflow-hidden sm:hidden">
                    <Image src="/images/realtors/footer-logo-mobile.png" alt="Rezide" fill sizes="229px" className="object-cover" />
                  </span>
                  <Logo height={30} className="hidden sm:block" />
                </>
              ) : (
                <Logo height={30} className="max-sm:h-6 max-sm:w-auto" />
              )}
            </Link>
            <p
              className={cn(
                "text-[17px] leading-normal text-pretty text-rez-steel max-sm:text-[13px] max-sm:leading-snug",
                realtorMobile && "max-sm:max-w-[300px] max-sm:text-sm max-sm:text-rez-full-white",
              )}
            >
              The only place for you to browse 100% trusted and authentic properties.
            </p>
          </div>
          <div className={cn("grid grid-cols-2 gap-x-6 gap-y-8 sm:flex sm:flex-wrap sm:gap-x-24 sm:gap-y-10", realtorMobile && "max-sm:w-full max-sm:gap-6")}>
            {FOOTER_COLUMNS.map((col, i) => (
              <ul
                key={i}
                className={cn(
                  "flex min-w-0 flex-col gap-2 max-sm:pl-2 sm:min-w-[150px] sm:gap-5",
                  i === FOOTER_COLUMNS.length - 1 && "max-sm:col-span-2 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-6 max-sm:gap-y-2 max-sm:pl-0 max-sm:[&>li]:pl-2",
                  realtorMobile && "max-sm:gap-2.5 max-sm:p-2.5",
                  // Keep the split last group in line with the columns above.
                  realtorMobile && i === FOOTER_COLUMNS.length - 1 && "max-sm:gap-x-6 max-sm:px-0 max-sm:[&>li]:pl-2.5",
                )}
              >
                {col.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href} className="text-base font-medium hover:text-rez-mocaccino max-sm:text-[15px] max-sm:font-normal">
                        {link.label}
                      </Link>
                    ) : (
                      <span
                        className={cn("text-base font-medium max-sm:text-[15px] max-sm:font-normal", realtorMobile && "max-sm:text-rez-cloud")}
                        title="Content not yet published"
                      >
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
        <p className="text-center text-sm text-rez-steel max-sm:text-[15px]">© 2026 Rezide. All rights reserved.</p>
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
