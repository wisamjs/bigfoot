import type { Metadata } from "next";
import localFont from "next/font/local";
import { buttonClasses } from "@/components/ui/button-classes";
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

const title = "Bigfoot: job application tracker";
const description =
  "Job hunting can feel like chasing Bigfoot. Track your Applications, organize your Interviews, and find yours.";

// The home-screen icons (apple-icon.png, manifest.webmanifest) and the shared-link preview
// (opengraph-image.png, twitter-image.png) are files beside this one; scripts/app-icons.sh makes
// them from docs/brand/mascot.png. Every page, a Share link's Journey included, shares this
// preview, so it never shows anything about a job seeker.
export const metadata: Metadata = {
  // Only main deploys (docs/runbooks/vercel.md), so preview images always point at Production.
  metadataBase: new URL("https://bigfoot.wisamzaghal.com"),
  title,
  description,
  appleWebApp: { title: "Bigfoot" },
  openGraph: { type: "website", siteName: "Bigfoot", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${allo.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        {/* First stop for Tab on every page. Each page's <main> has id="main". */}
        <a href="#main" className={`skip-link ${buttonClasses("brand")}`}>
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
