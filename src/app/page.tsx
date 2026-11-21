import { Suspense } from "react";
import { AccountDeletedNotice } from "@/components/landing/account-deleted-notice";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <RedirectIfSignedIn />
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
