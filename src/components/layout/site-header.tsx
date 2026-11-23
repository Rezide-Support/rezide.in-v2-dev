"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MenuIcon } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CompareMenu } from "@/features/compare/compare-menu";
import { CityPicker } from "@/features/location/city-picker";
import { initials } from "@/lib/format";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { usePreferredCity } from "@/stores/preferences";
import { useSession } from "@/stores/session";
import { useRealtorCornerUrl } from "@/lib/realtor-corner";

/** City control. On results pages it also updates the URL so the list follows the city. */
function HeaderCity({ variant, fullWidth = false }: { variant?: "compact" | "bar"; fullWidth?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { city: preferred, setCity } = usePreferredCity();
  const onResults = pathname === "/properties" || pathname === "/projects/search" || pathname === "/realtors";
  const city = onResults ? params.get("city") || preferred : preferred;

  const onSelect = (next: string) => {
    setCity(next);
    if (onResults) {
      const sp = new URLSearchParams(params.toString());
      sp.set("city", next);
      sp.delete("loc");
      sp.delete("page");
      if (pathname === "/realtors") {
        for (const key of ["subRegions", "locality", "projects"]) sp.delete(key);
      }
      router.push(`${pathname}?${sp.toString()}`);
    }
  };
  return (
    <CityPicker
      city={city}
      onSelect={onSelect}
      variant={variant}
      triggerClassName={fullWidth ? "h-11 w-full rounded-none text-left text-sm font-semibold [&>span]:flex-1" : "md:text-[13px]"}
    />
  );
}

function CityFallback() {
  const { city } = usePreferredCity();
  return (
    <span className="flex h-9 items-center gap-1.5 px-3 text-sm font-bold md:text-[13px]">
      {city}
      <Icon name="chevron-left" size={12} className="-rotate-90" />
    </span>
  );
}

function AccountButton({ textOnly = false }: { textOnly?: boolean }) {
  const { session, status } = useSession();
  if (status === "authenticated" && session) {
    const href = session.user.role === "realtor" ? "/dashboard" : "/account";
    return (
      <Link
        href={href}
        className="flex items-center rounded-full transition-opacity hover:opacity-85 md:order-last"
        aria-label={`Your account: ${session.user.firstName} ${session.user.lastName}`}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-black text-[13px] font-bold text-rez-full-white md:size-9 md:text-xs">
          {initials(`${session.user.firstName} ${session.user.lastName}`)}
        </span>
      </Link>
    );
  }
  if (textOnly) return <Button asChild variant="outline" className="h-9 w-20 text-sm font-medium"><Link href="/login">Sign in</Link></Button>;
  return (
    <>
      <Link
        href="/login"
        className="flex h-9 items-center rounded-full border border-rez-smoke px-3.5 text-[13px] font-semibold hover:bg-rez-cloud md:hidden"
      >
        Sign in
      </Link>
      <Button asChild variant="secondary" size="icon" aria-label="Sign in" className="max-md:hidden md:order-last md:size-9">
        <Link href="/login">
          <Icon name="user" size={20} />
        </Link>
      </Button>
    </>
  );
}

function DesktopNavList({ pathname }: { pathname: string }) {
  const cornerUrl = useRealtorCornerUrl();
  return (
    <ul className="flex items-center gap-1 whitespace-nowrap">
      {NAV_ITEMS.map((item, i) => {
        const active = isNavItemActive(item, pathname);
        return (
          <li key={item.id} className={cn("items-center", i === 0 ? "flex" : i === 1 ? "hidden min-[880px]:flex" : "hidden min-[1280px]:flex")}>
            {item.separatorBefore && <span aria-hidden className="mx-1.5 h-[18px] w-px bg-rez-smoke" />}
            <Link
              href={item.id === "corner" ? cornerUrl : item.href}
              {...(item.id === "corner" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                // Tighter on narrower screens so the five links never run over the city divider or the account buttons.
                "relative flex h-12 items-center px-3 text-[13px] tracking-[0.06em] uppercase transition-colors md:text-xs min-[1536px]:px-4",
                active ? "font-bold text-black" : "font-medium text-rez-graphite hover:text-black",
              )}
            >
              {item.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 bottom-[9px] h-[3px] origin-center rounded-full bg-rez-mocaccino transition-transform duration-300 ease-rez min-[1536px]:inset-x-4",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MobileNavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const cornerUrl = useRealtorCornerUrl();
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <li key={item.id}>
            <Link
              href={item.id === "corner" ? cornerUrl : item.href}
              {...(item.id === "corner" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              scroll={false}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 items-center rounded-full px-4 text-[13px] tracking-[0.06em] uppercase hover:bg-rez-cloud",
                active ? "bg-rez-cloud font-bold" : "font-medium",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* The current path is request data on dynamic routes, so path-aware lists stream inside Suspense. */
function DesktopNav() {
  return <DesktopNavList pathname={usePathname()} />;
}
function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return <MobileNavList pathname={usePathname()} onNavigate={onNavigate} />;
}

function RealtorMobileHeader({ openMenu }: { openMenu: () => void }) {
  if (usePathname() !== "/realtors") return null;
  return <div className="realtor-mobile-header sm:hidden">
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[#eaeaea] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]"><Link href="/" aria-label="Rezide home" className="flex h-11 min-w-0 max-w-[119px] flex-1 items-center"><Image src="/images/realtors/logo-mobile.png" alt="Rezide" width={119} height={44} priority /></Link><div className="flex shrink-0 items-center gap-2"><AccountButton textOnly /><Button className="size-9 rounded-full p-0" aria-label="Open menu" aria-haspopup="dialog" onClick={openMenu}><Image src="/images/realtors/menu-mobile.svg" alt="" width={18} height={18} /></Button></div></div>
    <div className="px-4"><HeaderCity variant="bar" fullWidth /></div>
  </div>;
}

export function SiteHeader({ compact = false }: { compact?: boolean } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header data-dashboard-compact={compact || undefined} className="group/realtor-header sticky top-0 z-50 border-b border-rez-smoke bg-white max-md:rounded-b-[20px] max-md:border-b-0 max-md:shadow-rez-sm max-sm:has-[.realtor-mobile-header]:rounded-b-3xl max-sm:has-[.realtor-mobile-header]:border-0">
      {/* /realtors on phones has its own header (logo, sign in, menu, city); it hides the standard bar below. */}
      <Suspense fallback={null}>
        <RealtorMobileHeader openMenu={() => setMenuOpen(true)} />
      </Suspense>
      <div className="mx-auto flex h-16 max-w-[1344px] items-center gap-2 px-4 max-sm:group-has-[.realtor-mobile-header]/realtor-header:hidden sm:gap-5 md:h-16 md:px-8">
        <Link href="/" scroll={false} aria-label="Rezide home" className="flex shrink-0 items-center text-black">
          <Logo height={16} className="sm:hidden" />
          <Logo height={20} className="hidden sm:block" />
        </Link>

        <div className="flex min-w-0 shrink items-center gap-3 max-md:hidden sm:-ml-2">
          <Suspense fallback={<CityFallback />}>
            <HeaderCity />
          </Suspense>
          <span aria-hidden className="hidden h-6 w-px bg-rez-smoke md:block" />
        </div>

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 justify-center md:flex">
          <Suspense fallback={<DesktopNavList pathname="" />}>
            <DesktopNav />
          </Suspense>
        </nav>

        {/* Account first in the DOM so phones show it before the menu, as in the design; desktop moves it last. */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <AccountButton />
          <div className="max-md:hidden md:order-1">
            <CompareMenu />
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                aria-label="Open menu"
                className="size-9 px-0 text-[13px] tracking-[0.06em] max-md:border-black max-md:bg-black max-md:text-white max-md:hover:bg-black/85 md:h-9 md:w-auto md:px-4 md:text-xs min-[1280px]:hidden"
              >
                <MenuIcon className="size-[18px] md:hidden" aria-hidden />
                <span className="hidden md:inline">MENU</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(340px,100vw)] p-0">
              <SheetHeader className="border-b border-rez-smoke p-6">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu" className="p-3 max-md:pb-0">
                <Suspense fallback={<MobileNavList pathname="" onNavigate={close} />}>
                  <MobileNav onNavigate={close} />
                </Suspense>
              </nav>
              {/* Compare sits outside the primary list: the header shows it as a button on wider screens. */}
              {/* Same 4px gap as between the menu items above (the sheet adds 16px between its parts). */}
              <div className="-mt-3 px-3 md:hidden">
                <Link
                  href="/compare"
                  onClick={close}
                  className="flex h-12 items-center rounded-full px-4 text-[13px] font-medium tracking-[0.06em] uppercase hover:bg-rez-cloud"
                >
                  Compare
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {/* Phone city bar; /realtors shows its own in the realtor header above. */}
      <div className="border-t border-rez-smoke px-4 max-sm:group-has-[.realtor-mobile-header]/realtor-header:hidden md:hidden">
        <Suspense fallback={<CityFallback />}>
          <HeaderCity variant="bar" />
        </Suspense>
      </div>
    </header>
  );
}
