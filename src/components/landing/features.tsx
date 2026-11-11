import type { LucideIcon } from "lucide-react";
import { BarChart3, BellRing, Kanban, Link2, NotebookPen, Users } from "lucide-react";
import { Container, SectionHeader } from "@/components/ui";

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Kanban,
    title: "Pipeline board",
    body: "Drag roles from Saved to Offer. Each column shows what needs your attention today.",
  },
  {
    icon: NotebookPen,
    title: "Interview prep notes",
    body: "Keep research, STAR stories and questions to ask on the card for each role.",
  },
  {
    icon: BellRing,
    title: "Follow-up reminders",
    body: "Bigfoot nudges you to follow up after a week of silence, so nothing goes cold.",
  },
  {
    icon: Users,
    title: "Contacts and referrals",
    body: "Link recruiters, hiring managers and referrers to each role, with every conversation logged.",
  },
  {
    icon: BarChart3,
    title: "Search analytics",
    body: "See response rates by source and stage, so you know where to spend your time.",
  },
  {
    icon: Link2,
    title: "One-click capture",
    body: "Paste a job link and Bigfoot fills in the company, title, salary range and location.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-24">
      <Container>
        <SectionHeader
          id="features-title"
          eyebrow="Features"
          title="Everything you need for the hunt, nothing you don’t"
          lead="Bigfoot replaces the spreadsheet, the sticky notes and the calendar reminders with one focused workspace."
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
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
