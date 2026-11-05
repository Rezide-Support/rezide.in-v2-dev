import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#eceef5]" />}>
      <AuthScreen mode="signin" />
    </Suspense>
  );
}
