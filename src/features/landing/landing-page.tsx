import type { ReactNode } from "react";
import { Features } from "@/features/landing/features";
import { Footer } from "@/features/landing/footer";
import { Hero } from "@/features/landing/hero";
import { Navbar } from "@/features/landing/navbar";
import { SignUpCall } from "@/features/landing/sign-up-call";

/** The home page, signed out. `notice` goes above the hero: the route passes the account-deleted notice. */
export function LandingPage({ notice }: { notice?: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">
        {notice}
        <Hero />
        <Features />
        <SignUpCall />
      </main>
      <Footer />
    </>
  );
}
