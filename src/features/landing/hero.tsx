import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { HeroPreview } from "@/features/landing/hero-preview";
import { PeekOverBigfoot, WelcomeBigfoot } from "@/features/shell/illustrations";

/**
 * The home page's first screen. On a phone Bigfoot stands above the heading, so the first thing a
 * job seeker sees on a shared link is him; from lg he stands beside it (BIG-231). Bigfoot peeks over
 * the Applications preview at every width: at its right edge, and from lg at its left, so he isn't
 * stacked under the one beside the heading.
 */
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="hero-atmosphere py-16 md:py-24">
      <Container>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <WelcomeBigfoot className="mx-auto h-auto w-[176px] sm:w-[220px] lg:order-last lg:w-[300px]" />
          <div className="text-center lg:text-left">
            <h1
              id="hero-title"
              className="text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-heading md:text-[44px] lg:text-[56px]"
            >
              Job hunting can feel like chasing Bigfoot. <span className="inline-block md:block">Let’s find yours.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[56ch] text-balance text-lg leading-[1.5] text-body lg:mx-0 lg:text-xl">
              Track your Applications, organize your Interviews, and bring a little clarity to the chaos of job hunting.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link href="/sign-up" className={buttonClasses("brand", "xl")}>
                Find your Bigfoot
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-24 sm:mt-28">
          <PeekOverBigfoot className="pointer-events-none absolute bottom-[calc(100%-4px)] right-4 z-10 h-auto w-28 sm:right-10 sm:w-36 lg:left-10 lg:right-auto" />
          {/* On a phone the preview stops after a few rows and fades out, so it doesn't take a whole
              screen of scrolling to reach the features. */}
          <div className="max-md:max-h-[480px] max-md:overflow-hidden max-md:[mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
            <HeroPreview />
          </div>
        </div>
      </Container>
    </section>
  );
}
