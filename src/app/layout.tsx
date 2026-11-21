import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Allo (allo-font, SIL OFL 1.1), self-hosted from the npm package so dev, smoke and build
// never reach a font CDN. The full variable font, so globals.css can set its roundness axis;
// one file covers every weight from 100 to 900.
const allo = localFont({
  variable: "--font-allo",
  src: [
    {
      path: "../../node_modules/allo-font/fonts/webfonts/AlloVariable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Bigfoot: job application tracker",
  description:
    "Job hunting is chasing Bigfoot. Track every application, interview and follow-up in one pipeline until you find yours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${allo.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
