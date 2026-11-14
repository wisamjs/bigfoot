import type { LucideIcon } from "lucide-react";
import { CalendarDays, Kanban, ListChecks } from "lucide-react";
import { Container, SectionHeader } from "@/components/ui";

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Kanban,
    title: "Pipeline board",
    body: "See every Application grouped by what it’s waiting on: a reply, an Interview or your answer to an Offer.",
  },
  {
    icon: ListChecks,
    title: "Interviews",
    body: "Log each Interview with its kind and date. Every card lists them all, completed ones muted.",
  },
  {
    icon: CalendarDays,
    title: "Coming up",
    body: "A calendar of your Interviews, with the next one at the top of your dashboard.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-24">
      <Container>
        <SectionHeader
          id="features-title"
          eyebrow="Features"
          title="Your search in one place"
          lead="Add an Application, log its Interviews and see what’s next."
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="card p-8">
              {/* Icon shape LG: 48px container, 24px icon, 24px radius */}
              <span className="icon-shape mb-6 size-12 rounded-card">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="m-0 mb-2 text-base font-medium leading-[1.25] text-heading lg:text-xl">
                {title}
              </h3>
              <p className="m-0 text-base leading-[1.7] text-body">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
