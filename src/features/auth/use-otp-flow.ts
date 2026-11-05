"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { requestOtp, verifyOtp, type OtpChallenge, type OtpOptions, type VerifyOtpInput } from "@/services/auth";
import type { Session } from "@/types/models";

/**
 * Phone → OTP → verified flow shared by sign-in, sign-up and the Realtor
 * Corner checks. Handles the resend countdown and request/verify states.
 * `options` says what the OTP is for (sign-in by default) and for which role.
 */
export function useOtpFlow(onVerified: (session: Session) => void, options: OtpOptions = {}) {
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const send = useMutation({
    mutationFn: (phone: string) => requestOtp(phone, options),
    onSuccess: (c) => {
      setChallenge(c);
      setSecondsLeft(c.resendInSeconds);
    },
  });

  const verify = useMutation({
    mutationFn: (input: VerifyOtpInput) => verifyOtp(input, options),
    onSuccess: onVerified,
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  return {
    challenge,
    step: challenge ? ("otp" as const) : ("phone" as const),
    secondsLeft,
    send,
    verify,
    changeNumber: () => {
      setChallenge(null);
      send.reset();
      verify.reset();
    },
  };
}
