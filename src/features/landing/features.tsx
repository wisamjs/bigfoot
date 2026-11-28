import type { ComponentType } from "react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import {
  CalendarSurprisedBigfoot,
  ClipboardWritingBigfoot,
  FamilyBigfoot,
  FolderHugBigfoot,
} from "@/features/shell/illustrations";

/** Each feature leads with Bigfoot doing it (BIG-231). */
const features: { Art: ComponentType<{ className?: string }>; title: string; body: string }[] = [
  {
    Art: FolderHugBigfoot,
    title: "Applications",
    body: "See all your Applications in one place, organized by what comes next — a reply, an Interview, or a decision on an Offer.",
  },
  {
    Art: ClipboardWritingBigfoot,
    title: "Interviews",
    body: "Keep track of Interview dates, categories, and progress for every Application. See what’s coming up and how far you’ve made it.",
  },
  {
    Art: CalendarSurprisedBigfoot,
    title: "Interview calendar",
    body: "See all your upcoming Interviews at a glance, with your next Interview front and centre on your dashboard.",
  },
  {
    Art: FamilyBigfoot,
    title: "Share your Journey",
    body: "Keep family and friends in the loop with a private, Passcode-protected Share link. They can follow your progress without signing in, while your personal notes stay private.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-16 md:py-24">
      <Container>
        <SectionHeader
          id="features-title"
          title="Your search in one place"
          lead="Add your Applications, track your Interviews, and see what’s next."
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
          {features.map(({ Art, title, body }) => (
            // From md two cards share a row, too narrow for Bigfoot beside the text until lg, so he
            // stands above it in between.
            <li
              key={title}
              className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8 md:flex-col md:items-stretch lg:flex-row lg:items-center"
            >
              <Art className="mx-auto h-32 w-auto shrink-0 sm:mx-0 md:mx-auto lg:mx-0 lg:h-36" />
              <div>
                <h3 className="m-0 mb-2 text-base font-medium leading-[1.25] text-heading lg:text-xl">{title}</h3>
                <p className="m-0 text-pretty text-base leading-[1.7] text-body">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
