import { Suspense } from "react";
import { AccountDeletedNotice } from "@/components/landing/account-deleted-notice";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Navbar />
      <main>
        <Suspense>
          <AccountDeletedNotice searchParams={searchParams} />
        </Suspense>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
