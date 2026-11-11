import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Ubuntu, latin subset, shipped in the repo (licence: fonts/UFL.txt) so dev, smoke and
// build never need to reach Google Fonts.
const ubuntu = localFont({
  variable: "--font-ubuntu",
  src: [
    { path: "./fonts/ubuntu-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ubuntu-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ubuntu-latin-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Bigfoot: job application tracker",
  description:
    "Job hunting is chasing Bigfoot. Track every application, interview and follow-up in one pipeline until you find yours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ubuntu.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
