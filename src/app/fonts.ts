import localFont from "next/font/local";

/*
 * Brand typefaces, self-hosted from the files supplied in the Rezide prototype.
 * Montserrat and Special Gothic are SIL Open Font License faces.
 * The latin and latin-ext subsets are separate families so the browser falls
 * back to the extended file for glyphs such as the rupee sign (U+20B9).
 */
export const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat-latin.woff2", weight: "300 900", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const montserratExt = localFont({
  src: [
    { path: "./fonts/montserrat-latin-ext.woff2", weight: "300 900", style: "normal" },
  ],
  variable: "--font-montserrat-ext",
  display: "swap",
  preload: false,
});

export const specialGothic = localFont({
  src: [
    { path: "./fonts/special-gothic-latin.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-special-gothic",
  display: "swap",
  preload: false,
});

export const specialGothicExpanded = localFont({
  src: [
    {
      path: "./fonts/special-gothic-expanded-one-latin.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-special-gothic-expanded",
  display: "swap",
});

export const fontVariables = [
  montserrat.variable,
  montserratExt.variable,
  specialGothic.variable,
  specialGothicExpanded.variable,
].join(" ");
