"use client";

//import { useRouter } from "next/navigation";  
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  directoryFirmHref,
  directoryPersonHref,
  type DirectoryFirm,
  type DirectoryPerson,
} from "./directory-model";
import { DirectoryLeadForm } from "./directory-forms";
import { CredentialPills, type CredentialKey } from "./credentials";
import { cn } from "@/lib/utils";

export function DirectoryPhoto({
  src,
  name,
  portrait = false,
  className,
}: {
  src: string;
  name: string;
  portrait?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState("");
  return (
    <div
      className={cn(
        "relative flex min-h-[180px] items-center justify-center bg-rez-cloud p-4",
        portrait ? "sm:w-[150px]" : "sm:w-[180px]",
        className,
      )}
    >
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          loading="eager"
          sizes="180px"
          className={
            portrait ? "object-cover object-top" : "object-contain p-5"
          }
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Image src="/images/empty.gif" alt="" width={160} height={160} unoptimized />
      )}
    </div>
  );
}
export function DirectoryCard({
  firm,
  person,
}: {
  firm: DirectoryFirm;
  person?: DirectoryPerson;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const { rent, sale } = firm;
  const name = person?.name || firm.name;
  const credentials: CredentialKey[] = [
    ...(firm.rera ? ["RERA" as const] : []),
    ...(firm.gst ? ["GST" as const] : []),
  ];
  const profileHref = person
    ? directoryPersonHref(firm, person)
    : directoryFirmHref(firm);
  return (
    <article
      className={cn(
        "grid h-full grid-cols-1 overflow-hidden rounded-[18px] border border-rez-smoke bg-white shadow-[0_2px_6px_0_#2c2c2c1f] sm:grid-cols-[135px_minmax(0,1fr)]",
        !person && "min-h-[305px] sm:grid-cols-[180px_minmax(0,1fr)]",
        // Firm cards on laptops: a narrower logo column and a shorter card.
        !person && "lg:max-[1599.98px]:min-h-[250px] lg:max-[1599.98px]:grid-cols-[150px_minmax(0,1fr)]",
      )}
    >
      <Link
        href={profileHref}
        aria-label={`View ${name}'s profile`}
        className="hidden min-w-0 self-stretch sm:flex"
      >
        <DirectoryPhoto
          src={person ? person.photo : firm.logo}
          name={name}
          portrait={!!person}
          className={cn("min-h-[246px] w-full sm:w-full", !person && "lg:max-[1599.98px]:min-h-[200px]")}
        />
      </Link>
      <div className="flex min-w-0 flex-col gap-5 px-4 py-3.5 sm:gap-4">
        <div className="flex items-center gap-3.5 sm:items-start sm:gap-2.5">
          {person && (
            <Link
              href={profileHref}
              aria-label={`View ${name}'s profile`}
              className="shrink-0 overflow-hidden rounded-[10px] sm:hidden"
            >
              <DirectoryPhoto
                src={person.photo}
                name={name}
                portrait
                className="size-10 min-h-10 p-0 [&>span]:text-xs"
              />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "text-lg leading-5 font-semibold [overflow-wrap:anywhere]",
                !person && "text-base leading-8 sm:text-xl lg:max-[1599.98px]:text-lg lg:max-[1599.98px]:leading-7",
              )}
            >
              <Link className="hover:underline" href={profileHref}>
                {name}
              </Link>
            </h3>
            {person && (
              <Link
                href={directoryFirmHref(firm)}
                className="mt-1 block text-xs leading-[17px] text-rez-graphite hover:underline font-secondary"
              >
                {firm.name}
              </Link>
            )}
          </div>
          <Link
            href={directoryFirmHref(firm)}
            aria-label={`View ${firm.name}`}
            className={cn(
              "shrink-0 overflow-hidden rounded-[10px] border border-rez-smoke",
              !person && "sm:hidden",
            )}
          >
            <DirectoryPhoto
              src={firm.logo}
              name={firm.name}
              className="size-10 min-h-10 p-0 text-xs sm:w-10 [&>span]:text-xs [&_img]:p-0"
            />
          </Link>
        </div>
        {!person && (
          <div className="border-b border-rez-smoke pb-3">
            <CredentialPills
              credentials={credentials}
              markSrc="/images/realtors/verification.svg"
            />
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-1.5 gap-y-3 sm:gap-x-3">
          {person && (
            <DirectoryDetail label="Member of">{person.memberOf?.join(", ") || "Not provided"}</DirectoryDetail>
          )}
          <DirectoryDetail
            label="Specializing"
            className={!person ? "col-span-2" : undefined}
          >
            {person ? (
              person.specializations.join(", ") || "Not provided"
            ) : (
              // Firm cards on laptops: long lists stop after 3 lines (hover shows all; the firm page has them in full).
              <span className="lg:max-[1599.98px]:line-clamp-3" title={firm.specializations.join(", ") || undefined}>
                {firm.specializations.join(", ") || "Not provided"}
              </span>
            )}
          </DirectoryDetail>
          {person ? (
            <>
              <DirectoryDetail label="Firm listings">
                {rent !== null && sale !== null ? `${rent + sale} · ` : ""}
                {rent ?? "—"} Rental · {sale ?? "—"} Resale
              </DirectoryDetail>
              <DirectoryDetail label="Speaks">
                {person.languages.join(", ") || "Not provided"}
              </DirectoryDetail>
            </>
          ) : (
            <>
              <DirectoryDetail label="Location" className="col-span-2">
                <span className="lg:max-[1599.98px]:line-clamp-4" title={[...new Set([...firm.subRegions, ...firm.localities])].join(", ") || undefined}>
                  {[...new Set([...firm.subRegions, ...firm.localities])].join(", ") || "Not provided"}
                </span>
              </DirectoryDetail>
              <DirectoryDetail label="Since">
                {firm.since || "Not provided"}
              </DirectoryDetail>
              <DirectoryDetail label="Team">
                {firm.people.length}
              </DirectoryDetail>
            </>
          )}
        </dl>
        {person ? (
          <Button
            variant="outline"
            className="mt-auto h-11 w-full gap-3 border-rez-smoke text-sm uppercase sm:h-[48px] sm:max-w-[172px] sm:text-base sm:normal-case"
            onClick={() => setContactOpen(true)}
          >
            <Image
              src="/images/realtors/phone-mobile.svg"
              width={18}
              height={18}
              alt=""
              className="sm:hidden"
            />
            <Image
              src="/images/realtors/phone.svg"
              width={20}
              height={20}
              alt=""
              className="hidden sm:block"
            />
            Connect
          </Button>
        ) : (
          <div className="mt-auto flex items-center gap-2 sm:flex-wrap">
            <span className="hidden text-[10px] font-bold tracking-[0.1em] text-rez-graphite sm:inline">
              LIVE LISTINGS
            </span>
            {[
              [rent, "Rental"],
              [sale, "Sale"],
            ].map(([value, label]) => (
              <span
                key={label}
                className="min-w-0 flex-1 rounded-full bg-rez-cloud px-2 py-1 text-center text-[clamp(10px,3vw,12px)] font-semibold sm:flex-none sm:px-3 sm:text-xs"
              >
                <b className="font-extrabold">{value ?? "—"}</b> {label}
                <span className="sm:hidden"> Listings</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="gap-5 rounded-[20px] p-5 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[calc(100dvh-16px)] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-[32px] max-sm:rounded-b-none max-sm:px-4 max-sm:pt-3 max-sm:pb-8 max-sm:[&>button]:top-9 sm:max-w-[583px] sm:px-10 sm:py-6">
          <div
            aria-hidden
            className="mx-auto h-1 w-12 rounded-sm bg-rez-smoke sm:hidden"
          />
          <DialogHeader className="flex-row items-center gap-3 pr-10 text-left">
            <DirectoryPhoto
              src={person?.photo || firm.logo}
              name={name}
              className="hidden size-10 min-h-10 shrink-0 rounded-[10px] p-0 sm:flex sm:w-10 [&>span]:text-sm [&_img]:p-0"
            />
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold sm:font-bold">
                Connect with {name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {firm.name}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DirectoryLeadForm firmId={firm.id} recipient={name} embedded />
        </DialogContent>
      </Dialog>
    </article>
  );
}

function DirectoryDetail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 sm:gap-[7px]", className)}>
      <dt className="text-[11px] leading-4 text-rez-graphite font-secondary sm:text-sm">
        {label}
      </dt>
      <dd className="text-[11px] leading-4 font-bold [overflow-wrap:anywhere] sm:text-sm">
        {children}
      </dd>
    </div>
  );
}
