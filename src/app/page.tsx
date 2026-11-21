import { Suspense } from "react";
import { AccountDeletedNotice } from "@/features/landing/account-deleted-notice";
import { Features } from "@/features/landing/features";
import { Footer } from "@/features/landing/footer";
import { Hero } from "@/features/landing/hero";
import { Navbar } from "@/features/landing/navbar";

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
