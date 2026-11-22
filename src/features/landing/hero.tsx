import Link from "next/link";
import { ApplicationList } from "@/features/applications/applicationList";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { Container } from "@/components/ui/container";
import { previewApplications } from "@/lib/mock-data";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="hero-atmosphere py-24">
      <Container>
        <div className="mx-auto max-w-[900px] text-center">
          <h1
            id="hero-title"
            className="text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-heading md:text-[40px] lg:text-[60px]"
          >
            Job hunting is chasing Bigfoot. <span className="inline-block md:block">Let’s find yours.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[70ch] text-balance text-lg leading-[1.5] text-body lg:text-xl">
            Bigfoot keeps every role you apply to, and every Interview for it, in one place.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <Link href="/sign-up" className={buttonClasses("brand", "xl")}>
              Find your Bigfoot
            </Link>
          </div>
        </div>

        <div className="mt-16">
          <ApplicationList decorative applications={previewApplications} />
        </div>
      </Container>
    </section>
  );
}
