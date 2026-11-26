"use client";

import Image from "next/image";
import { Fragment } from "react";
import { REZIDE_YOUTUBE, type TeamMember } from "./about-content";

/*
 * rezide.in's /team/<slug> page: a white card with the photo on the left and the name, role,
 * LinkedIn / YouTube buttons and bio on the right (stacked on phones). Phones and tablets also get
 * rezide.in's "Save Contact" button, which downloads the member's contact card (.vcf).
 */

/** Renders rezide.in's bold runs, marked **like this** in the content. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-black">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function saveContact(m: TeamMember) {
  const { firstName, lastName, mobile, email } = m.contact;
  const fullName = `${firstName} ${lastName}`;
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${lastName};${firstName};;;`,
    `FN:${fullName}`,
    `TEL;TYPE=CELL,VOICE:${mobile}`,
    `TEL;TYPE=HOME,VOICE:${mobile}`,
    `EMAIL;TYPE=INTERNET:${email}`,
    `URL:${window.location.origin}/team/${m.slug}`,
    "END:VCARD",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([card], { type: "text/vcard" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fullName.replace(/ /g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const iconButton = "grid size-10 place-items-center rounded-lg bg-[#f1f2f4] text-[#475467] transition-colors hover:bg-[#e4e7ec] hover:text-black";

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18.34H5.67V9.75h2.67v8.59ZM7 8.58a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Zm11.34 9.76h-2.67v-4.18c0-1-.02-2.28-1.39-2.28-1.39 0-1.6 1.09-1.6 2.21v4.25H10V9.75h2.56v1.17h.04a2.8 2.8 0 0 1 2.52-1.39c2.7 0 3.2 1.78 3.2 4.09v4.72Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  );
}

export function TeamMemberView({ member: m }: { member: TeamMember }) {
  return (
    <section aria-labelledby="member-name" className="flex flex-1 flex-col items-center bg-[#f8fafc] px-4 pt-4 pb-12 lg:pt-8">
      <button
        type="button"
        onClick={() => saveContact(m)}
        className="my-4 flex w-fit items-center justify-center rounded-lg bg-black px-6 py-3 text-white transition-colors hover:bg-black/85 lg:hidden"
      >
        <svg className="mr-2 size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Save Contact
      </button>

      <article className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-lg">
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:gap-12">
          <div className="flex justify-center md:justify-start">
            <Image
              src={m.image}
              alt={m.name}
              width={m.width}
              height={m.height}
              priority
              sizes="(min-width: 768px) 400px, 90vw"
              className="h-auto w-full max-w-[400px] self-start rounded-2xl object-cover grayscale"
            />
          </div>
          <div>
            <h1 id="member-name" className="text-3xl font-bold text-[#111827]">
              {m.name}
            </h1>
            <p className="mt-3 text-xl text-[#4b5563] lg:text-2xl">
              <Rich text={m.role} />
            </p>
            <div className="mt-6 flex gap-4">
              {m.profileLinkedin && (
                <a href={m.profileLinkedin} target="_blank" rel="noopener noreferrer" aria-label={`Follow ${m.name} on LinkedIn`} className={iconButton}>
                  <LinkedInIcon />
                </a>
              )}
              <a href={REZIDE_YOUTUBE} target="_blank" rel="noopener noreferrer" aria-label="Follow Rezide on YouTube" className={iconButton}>
                <YouTubeIcon />
              </a>
            </div>
            <div className="mt-6 flex flex-col gap-4 text-base text-[#4b5563]">
              {m.bio.map((para) => (
                <p key={para.slice(0, 40)}>
                  <Rich text={para} />
                </p>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
