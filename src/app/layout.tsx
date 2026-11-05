import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rezide · Genuine listings only",
    template: "%s · Rezide",
  },
  description:
    "Browse trusted homes, offices, retail, industrial and land listings across India. Find RERA-registered realtors and list your property free.",
  applicationName: "Rezide",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-black px-5 py-3 text-sm font-semibold text-rez-full-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
