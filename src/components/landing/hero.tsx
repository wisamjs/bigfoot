import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth-button";
import { PipelineBoard } from "@/components/pipeline-board";
import { Badge, Container } from "@/components/ui";
import { getUpcoming } from "@/lib/applications";
import { previewApplications } from "@/lib/mock-data";

export function Hero() {
  const upcoming = getUpcoming(previewApplications).length;

  return (
    <section id="top" aria-labelledby="hero-title" className="hero-atmosphere py-24">
      <Container>
        <div className="mx-auto max-w-[900px] text-center">
          <Badge tone="brand" pill>
            <Sparkles className="size-3" aria-hidden />
            Early preview
          </Badge>
          <h1
            id="hero-title"
            className="mt-6 mb-6 text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-heading md:text-[40px] lg:text-[60px]"
          >
            Job hunting is chasing Bigfoot. Let’s find yours.
          </h1>
          <p className="mx-auto max-w-[70ch] text-lg leading-[1.7] text-body lg:text-xl">
            Bigfoot keeps every role you apply to, and every Interview for it, in one Pipeline.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <GoogleAuthButton size="xl">Sign up with Google</GoogleAuthButton>
            <GoogleAuthButton variant="secondary" size="xl">
              Sign in
            </GoogleAuthButton>
          </div>
          <p className="mx-auto mt-4 max-w-[70ch] text-sm leading-[1.6] text-body">
            Signing in with Google shares your name, email and photo with Bigfoot. Read our{" "}
            <Link
              href="/privacy"
              className="rounded-control text-fg-brand underline underline-offset-4 transition-colors hover:no-underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="mt-16">
          <PipelineBoard
            decorative
            title="Pipeline"
            subtitle={`${upcoming} upcoming ${upcoming === 1 ? "Interview" : "Interviews"}`}
            applications={previewApplications}
          />
        </div>
      </Container>
    </section>
  );
}
