import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TEAM, teamMember } from "@/features/about/about-content";
import { TeamMemberView } from "@/features/about/team-member-view";

export function generateStaticParams() {
  return TEAM.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/team/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = teamMember(slug);
  if (!m) return { title: "Team member not found" };
  // rezide.in: "Viraj Bhatia - Our Team | Rezide Solutions".
  return { title: `${m.name} - Our Team | Rezide Solutions`, description: m.bio[0].replace(/\*\*/g, "") };
}

async function Member({ params }: Pick<PageProps<"/team/[slug]">, "params">) {
  const { slug } = await params;
  const m = teamMember(slug);
  if (!m) notFound();
  return <TeamMemberView member={m} />;
}

/** rezide.in's team member page, opened from a card in The Team on /about. */
export default function TeamMemberPage({ params }: PageProps<"/team/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-[#f8fafc]" aria-busy="true" />}>
      <Member params={params} />
    </Suspense>
  );
}
