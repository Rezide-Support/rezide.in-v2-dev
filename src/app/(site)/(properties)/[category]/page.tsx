import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyRails } from "@/features/home/rails";
import { categoryById } from "@/lib/constants";
import { PATH_CATEGORIES, isPropertyCategory } from "@/lib/home-routes";

export function generateStaticParams() {
  return PATH_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isPropertyCategory(category)) return {};
  const noun = categoryById(category).noun;
  return {
    title: `${noun} for sale`,
    description: `Browse verified ${noun.toLowerCase()} for sale by location, budget and size.`,
  };
}

async function Rails({ params }: Pick<PageProps<"/[category]">, "params">) {
  const { category } = await params;
  // `/homes` itself redirects to `/` (next.config.ts); anything else unknown is a 404.
  if (!isPropertyCategory(category) || category === "homes") notFound();
  return <PropertyRails category={category} intent="buy" />;
}

export default function CategoryHomePage({ params }: PageProps<"/[category]">) {
  return (
    <Suspense>
      <Rails params={params} />
    </Suspense>
  );
}
