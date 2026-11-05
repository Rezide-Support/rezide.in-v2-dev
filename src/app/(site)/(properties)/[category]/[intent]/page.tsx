import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyRails } from "@/features/home/rails";
import { CATEGORIES, categoryById } from "@/lib/constants";
import { isPropertyCategory, leaseSlug } from "@/lib/home-routes";

/** `/homes/rent`, `/offices/lease`, `/retail/lease`, … */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id, intent: leaseSlug(c.id) }));
}

export async function generateMetadata({ params }: PageProps<"/[category]/[intent]">): Promise<Metadata> {
  const { category } = await params;
  if (!isPropertyCategory(category)) return {};
  const cat = categoryById(category);
  return {
    title: `${cat.noun} for ${cat.lease.toLowerCase()}`,
    description: `Browse verified ${cat.noun.toLowerCase()} for ${cat.lease.toLowerCase()} by location, budget and size.`,
  };
}

async function Rails({ params }: Pick<PageProps<"/[category]/[intent]">, "params">) {
  const { category, intent } = await params;
  if (!isPropertyCategory(category) || intent !== leaseSlug(category)) notFound();
  return <PropertyRails category={category} intent="rent" />;
}

export default function CategoryLeasePage({ params }: PageProps<"/[category]/[intent]">) {
  return (
    <Suspense>
      <Rails params={params} />
    </Suspense>
  );
}
