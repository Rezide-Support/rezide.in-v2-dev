"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MenuIcon } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CityPicker } from "@/features/location/city-picker";
import { initials } from "@/lib/format";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { usePreferredCity } from "@/stores/preferences";
import { useSession } from "@/stores/session";

/** City control. On results pages it also updates the URL so the list follows the city. */
function HeaderCity() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { city: preferred, setCity } = usePreferredCity();
  const onResults = pathname === "/properties" || pathname === "/projects/search";
  const city = onResults ? params.get("city") || preferred : preferred;

  const onSelect = (next: string) => {
    setCity(next);
    if (onResults) {
      const sp = new URLSearchParams(params.toString());
      sp.set("city", next);
      sp.delete("loc");
      sp.delete("page");
      router.push(`${pathname}?${sp.toString()}`);
    }
  };
  return <CityPicker city={city} onSelect={onSelect} />;
}

function CityFallback() {
  const { city } = usePreferredCity();
  return (
    <span className="flex h-9 items-center gap-1.5 px-3 text-sm font-bold">
      {city}
      <Icon name="chevron-left" size={12} className="-rotate-90" />
    </span>
  );
}

function AccountButton() {
  const { session, status } = useSession();
  if (status === "authenticated" && session) {
    const href = session.user.role === "realtor" ? "/dashboard" : "/account";
    return (
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 text-sm font-semibold hover:bg-rez-cloud"
        aria-label={`Your account: ${session.user.firstName} ${session.user.lastName}`}
      >
        <span className="hidden sm:inline">{session.user.firstName}</span>
        <span className="flex size-10 items-center justify-center rounded-full bg-black text-[13px] font-bold text-rez-full-white">
          {initials(`${session.user.firstName} ${session.user.lastName}`)}
        </span>
      </Link>
    );
  }
  return (
    <Button asChild variant="secondary" size="icon" aria-label="Sign in">
      <Link href="/login">
        <Icon name="user" size={20} />
      </Link>
    </Button>
  );
}

function DesktopNavList({ pathname }: { pathname: string }) {
  return (
    <ul className="flex items-center gap-1 whitespace-nowrap">
      {NAV_ITEMS.map((item, i) => {
        const active = isNavItemActive(item, pathname);
        return (
          <li key={item.id} className={cn("items-center", i < 2 ? "flex" : "hidden min-[1100px]:flex")}>
            {item.separatorBefore && <span aria-hidden className="mx-1.5 h-[18px] w-px bg-rez-smoke" />}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-12 items-center px-[18px] text-[13px] tracking-[0.06em] uppercase transition-colors",
                active ? "font-bold text-black" : "font-medium text-rez-graphite hover:text-black",
              )}
            >
              {item.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-[18px] bottom-0 h-[3px] origin-center rounded-full bg-rez-mocaccino transition-transform duration-300 ease-rez",
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
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
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

/**
 * Mobile-only Properties | Projects strip under the bar (as in the prototype),
 * shown inside those two sections so switching between them is one tap.
 */
function SectionStrip() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.id === "properties" || i.id === "projects");
  if (!items.some((i) => isNavItemActive(i, pathname))) return null;
  return (
    <nav aria-label="Browse" className="border-t border-rez-smoke md:hidden">
      <ul className="flex gap-2 px-4">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center px-2 text-[12px] tracking-[0.06em] uppercase",
                  active ? "font-bold text-black" : "font-medium text-rez-graphite",
                )}
              >
                {item.label}
                {active && <span aria-hidden className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-rez-mocaccino" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* The current path is request data on dynamic routes, so path-aware lists stream inside Suspense. */
function DesktopNav() {
  return <DesktopNavList pathname={usePathname()} />;
}
function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return <MobileNavList pathname={usePathname()} onNavigate={onNavigate} />;
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="relative z-20 border-b border-rez-smoke bg-white">
      <div className="mx-auto flex h-16 max-w-[1344px] items-center gap-2 px-4 sm:gap-5 md:h-[76px] md:px-8">
        <Link href="/" aria-label="Rezide home" className="flex shrink-0 items-center text-black">
          <Logo height={16} className="sm:hidden" />
          <Logo height={24} className="hidden sm:block" />
        </Link>

        <div className="flex min-w-0 shrink items-center gap-3 sm:-ml-2">
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

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                aria-label="Open menu"
                className="size-10 px-0 text-[13px] tracking-[0.06em] sm:w-auto sm:px-[18px] min-[1100px]:hidden"
              >
                <MenuIcon className="size-5 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">MENU</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(340px,100vw)] p-0">
              <SheetHeader className="border-b border-rez-smoke p-6">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu" className="p-3">
                <Suspense fallback={<MobileNavList pathname="" onNavigate={close} />}>
                  <MobileNav onNavigate={close} />
                </Suspense>
              </nav>
            </SheetContent>
          </Sheet>
          <AccountButton />
        </div>
      </div>
      <Suspense fallback={null}>
        <SectionStrip />
      </Suspense>
    </header>
  );
}
