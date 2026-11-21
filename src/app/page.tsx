import { Suspense } from "react";
import { AccountDeletedNotice } from "@/components/landing/account-deleted-notice";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Navbar />
      <main id="main">
        <Suspense>
          <AccountDeletedNotice searchParams={searchParams} />
        </Suspense>
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
