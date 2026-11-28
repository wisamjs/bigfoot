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
    body: "See every Application in one table, ordered by what it’s waiting on: a reply, an Interview or your answer to an Offer.",
  },
  {
    Art: ClipboardWritingBigfoot,
    title: "Interviews",
    body: "Log each Interview with its own title, its category and its date. Each Application shows its next one and how many are completed.",
  },
  {
    Art: CalendarSurprisedBigfoot,
    title: "Interview calendar",
    body: "A calendar of your Interviews, with the next one at the top of your dashboard.",
  },
  {
    Art: FamilyBigfoot,
    title: "Share your Journey",
    body: "Give family and friends a private Share link with its own Passcode. They follow your search without signing in, and never see your notes.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-16 md:py-24">
      <Container>
        <SectionHeader
          id="features-title"
          title="Your search in one place"
          lead="Add an Application, log its Interviews and see what’s next."
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
          {features.map(({ Art, title, body }) => (
            <li key={title} className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <Art className="mx-auto h-32 w-auto shrink-0 sm:mx-0 lg:h-36" />
              <div>
                <h3 className="m-0 mb-2 text-base font-medium leading-[1.25] text-heading lg:text-xl">{title}</h3>
                <p className="m-0 text-base leading-[1.7] text-body">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
