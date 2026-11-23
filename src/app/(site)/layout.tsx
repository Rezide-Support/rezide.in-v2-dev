import { Suspense } from "react";
import { FooterSwitch } from "@/components/layout/footer-switch";
// import { SiteFooter, SlimFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SignInModal } from "@/features/auth/sign-in-modal";
import { SiteFooter } from "@/components/layout/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      {/* The path is request data on dynamic routes, so the choice streams; the full footer is the fallback. */}
      {/* <Suspense fallback={<SiteFooter />}>
        <FooterSwitch full={<SiteFooter />} slim={<SlimFooter />} />
      </Suspense> */}
      <SiteFooter/>
      {/* rezide.in's sign-in popup, opened over any page with ?modal=signIn. */}
      <Suspense fallback={null}>
        <SignInModal />
      </Suspense>
    </>
  );
}
