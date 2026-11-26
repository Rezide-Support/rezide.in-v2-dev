"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/client";
import { OTP_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { loginWithPassword, requestOtp, verifyOtp } from "@/services/auth";
import { useSessionStore } from "@/stores/session";
import type { Session } from "@/types/models";
import type { CountryIso2 } from "react-international-phone";
import { CountryCodeSelect, dialCodeOf } from "@/components/common/country-code-select";

/*
 * rezide.in's sign-in popup (?modal=signIn): "Sign In to your Rezide Account" with one field for
 * an email address or a mobile number. A number gets "Send OTP" and the "OTP Verification" step;
 * an email gets a password field and "Sign In". It opens over the page, so an action that needed
 * an account (shortlist, compare) carries on once the visitor is signed in.
 */

export const SIGN_IN_MODAL = "signIn";

/** Opens the sign-in popup over the current page, as rezide.in's `?modal=signIn` links do. */
export function useOpenSignIn() {
  const router = useRouter();
  return () => {
    // Read at click time: reading the query while rendering would need a Suspense boundary at every caller.
    const params = new URLSearchParams(window.location.search);
    params.set("modal", SIGN_IN_MODAL);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS = /^\d+$/;

/** rezide.in's four OTP boxes. */
function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, digit: string) => {
    const next = value.padEnd(OTP_LENGTH, " ").split("");
    next[i] = digit || " ";
    onChange(next.join("").trimEnd());
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) boxes.current[i - 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    onChange(digits);
    boxes.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };
  return (
    <div className="mt-2 flex justify-center gap-3" role="group" aria-label={`${OTP_LENGTH}-digit OTP`}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          value={value[i]?.trim() ?? ""}
          onKeyDown={onKey(i)}
          onPaste={onPaste}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, digit);
            if (digit && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();
          }}
          className="size-[50px] border border-[#D6DBE3] text-center font-semibold text-black outline-none focus:border-black"
        />
      ))}
    </div>
  );
}

function SignInForm({ onSignedIn, signUpHref }: { onSignedIn: (s: Session) => void; signUpHref: string }) {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  // As the old site: India by default; the flag opens every country with its dial code.
  const [country, setCountry] = useState<CountryIso2>("in");

  const value = identity.trim();
  // Indian numbers go as before; another country's number carries its own code ("+1 4155550123").
  const phoneFor = (digits: string) => (country === "in" ? digits : `+${dialCodeOf(country)} ${digits}`);
  const isNumber = DIGITS.test(value);
  const isEmail = !isNumber && EMAIL.test(value);
  // As rezide.in: a number of five digits or more sends an OTP; an email needs a password of eight or more.
  const canOtp = isNumber && value.length > 4;
  const canPassword = isEmail && password.length > 7;

  const sendOtp = useMutation({
    mutationFn: (phone: string) => requestOtp(phone, { purpose: "signin" }),
    onSuccess: (c) => {
      setError("");
      setCode("");
      setOtpFor(c.phone);
      toast.success("OTP Sent!");
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const verify = useMutation({
    mutationFn: () => verifyOtp({ phone: otpFor ?? "", code, role: "seeker" }, { purpose: "signin" }),
    onSuccess: onSignedIn,
    onError: (e) => setError(errorMessage(e)),
  });
  const login = useMutation({
    mutationFn: () => loginWithPassword(value, password),
    onSuccess: onSignedIn,
    onError: (e) => setError(errorMessage(e)),
  });

  if (otpFor) {
    return (
      <>
        <DialogTitle className="text-center text-lg font-semibold">OTP Verification</DialogTitle>
        <DialogDescription className="sr-only">Enter the OTP sent to your mobile number</DialogDescription>
        <p className="mt-6 text-center text-sm text-[#6D6D6D]">
          We have send OTP on <b>{otpFor.startsWith("+") ? otpFor.replace(" ", "") : `+91${otpFor}`}</b>
        </p>
        <p className="text-center text-sm text-[#6D6D6D]">Please enter OTP to proceed with Rezide</p>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length !== OTP_LENGTH) return setError(`Enter the ${OTP_LENGTH}-digit OTP.`);
            verify.mutate();
          }}
        >
          <OtpBoxes value={code} onChange={setCode} />
          <div className="flex justify-end sm:px-10">
            <Button type="button" variant="link" className="min-h-8 py-1 text-sm font-normal text-[#6D6D6D]" disabled={sendOtp.isPending} onClick={() => sendOtp.mutate(otpFor)}>
              Resend OTP
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-center text-[0.8rem] font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mb-5 sm:px-10">
            <Button type="submit" className="w-full" disabled={verify.isPending}>
              {verify.isPending ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <DialogTitle className="pr-3 text-base leading-6 font-semibold tracking-tight sm:text-lg">Sign In to your Rezide Account</DialogTitle>
      <DialogDescription className="sr-only">Enter your email address or mobile number to sign in</DialogDescription>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (canPassword) login.mutate();
          else if (canOtp) sendOtp.mutate(phoneFor(value));
        }}
      >
        <div className="flex items-center rounded-md border border-[#8C8C8C] focus-within:border-black focus-within:ring-1 focus-within:ring-black">
          {/* As the old site: the flag and dial code open a list of every country (flag images, not emojis,
              which show as letters such as "IN" on Windows). */}
          {canOtp && <CountryCodeSelect value={country} onChange={setCountry} className="h-12 shrink-0 self-center py-0 leading-none data-[size=default]:h-12" />}
          <input
            type="text"
            autoFocus
            value={identity}
            onChange={(e) => {
              setIdentity(e.target.value);
              setPassword("");
            }}
            placeholder="Enter email address or mobile number"
            aria-label="Email address or mobile number"
            className="h-12 w-full min-w-0 flex-1 rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#7C7D89]"
          />
        </div>
        {isEmail && (
          <div className="flex items-center rounded-md border border-input focus-within:ring-1 focus-within:ring-black">
            <input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="Password"
              autoComplete="current-password"
              className="h-10 w-full flex-1 rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="button" variant="ghost" className="hover:bg-transparent" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((v) => !v)}>
              {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-center text-[0.8rem] font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10 w-full rounded-md text-sm font-semibold uppercase shadow-sm disabled:bg-[#909090] disabled:text-white disabled:opacity-100" disabled={!(canOtp || canPassword) || sendOtp.isPending || login.isPending}>
          {canOtp ? "Send OTP" : canPassword ? "Sign In" : "Continue"}
        </Button>
      </form>
      <p className="text-center text-sm leading-5 text-[#7C7D89]">
        Don&apos;t have an account?{" "}
        <Link href={signUpHref} className="font-medium text-blue-500">
          Sign Up
        </Link>
      </p>
    </>
  );
}

/** Mounted once in the site layout: shows when the address has `?modal=signIn`. */
export function SignInModal() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const signIn = useSessionStore((s) => s.signIn);
  const open = params.get("modal") === SIGN_IN_MODAL;

  const close = () => {
    const rest = new URLSearchParams(params.toString());
    rest.delete("modal");
    const query = rest.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const onSignedIn = (session: Session) => {
    signIn(session);
    toast.success("Login successfully!");
    // As rezide.in: signing in from the home page goes to the account; elsewhere the visitor stays put.
    if (pathname === "/") router.replace("/account");
    else close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-none" className={cn("gap-4 rounded-lg border border-[#D1D5DB] bg-white px-6 py-10 sm:min-h-[288px] sm:max-w-[576px] sm:px-12 sm:py-12 [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:size-6 [&>[data-slot=dialog-close]]:rounded-none [&>[data-slot=dialog-close]]:border-0 [&>[data-slot=dialog-close]]:bg-transparent [&>[data-slot=dialog-close]]:p-0 [&>[data-slot=dialog-close]]:text-[#555] [&>[data-slot=dialog-close]]:shadow-none")}>
        {/* Keyed so the form starts empty each time it opens. */}
        {open && <SignInForm key={String(open)} onSignedIn={onSignedIn} signUpHref={`/signup?next=${encodeURIComponent(pathname)}`} />}
      </DialogContent>
    </Dialog>
  );
}
