import { Sparkles } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth-button";
import { PipelineBoard } from "@/components/pipeline-board";
import { Badge, Container } from "@/components/ui";
import { previewApplications } from "@/lib/mock-data";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="hero-atmosphere py-24">
      <Container>
        <div className="mx-auto max-w-[900px] text-center">
          <Badge tone="brand" pill>
            <Sparkles className="size-3" aria-hidden />
            New: interview prep notes on every card
          </Badge>
          <h1
            id="hero-title"
            className="mt-6 mb-6 text-[32px] font-bold leading-[1.1] tracking-[-0.8px] text-heading md:text-[40px] lg:text-[60px]"
          >
            Every application. One sweet, calm pipeline.
          </h1>
          <p className="mx-auto max-w-[70ch] text-lg leading-[1.7] text-body lg:text-xl">
            Bigfoot tracks every role you save, apply to and interview for, then reminds you when
            to follow up. No more spreadsheets, lost emails or forgotten recruiters.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <GoogleAuthButton size="xl">Sign up with Google</GoogleAuthButton>
            <GoogleAuthButton variant="secondary" size="xl">
              Sign in
            </GoogleAuthButton>
          </div>
        </div>

        <div className="mt-16">
          <PipelineBoard
            decorative
            title="Fall 2026 search"
            subtitle="3 reminders this week"
            applications={previewApplications}
          />
        </div>
      </Container>
    </section>
  );
}
