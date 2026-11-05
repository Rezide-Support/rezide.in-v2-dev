import { Suspense } from "react";
import { PropertiesHero, PropertiesHeroView } from "@/features/home/home-hero";

/**
 * Shared by `/`, `/homes/rent`, `/offices`, `/offices/lease`, …
 * The hero lives in the layout so it stays mounted while the tabs navigate:
 * typed search text survives and only the photo and rails change.
 */
export default function PropertiesHomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<PropertiesHeroView category="homes" intent="buy" />}>
        <PropertiesHero />
      </Suspense>
      {children}
    </>
  );
}
