import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { DoubleThumbsUpBigfoot } from "@/features/shell/illustrations";

/** The home page's last word before the footer: Bigfoot cheers the job seeker on to sign up (BIG-231). */
export function SignUpCall() {
  return (
    <section aria-labelledby="sign-up-call-title" className="py-16 md:py-24">
      <Container>
        <div className="card hero-atmosphere flex flex-col items-center gap-6 px-6 py-10 text-center sm:px-10 md:flex-row md:gap-10 md:py-12 md:text-left">
          <DoubleThumbsUpBigfoot className="h-auto w-[140px] shrink-0 md:w-[168px]" />
          <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2
                id="sign-up-call-title"
                className="m-0 text-[28px] font-bold leading-[1.15] text-heading md:text-[36px]"
              >
                Ready to find yours?
              </h2>
              <p className="m-0 mt-4 max-w-[48ch] text-lg leading-[1.6] text-body">
                Sign in with Google, add your first Application, and let Bigfoot help you stay organized along the way.
              </p>
            </div>
            <Link href="/sign-up" className={`${buttonClasses("brand", "xl")} shrink-0`}>
              Find your Bigfoot
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
