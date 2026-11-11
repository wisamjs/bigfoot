import type { LucideIcon } from "lucide-react";
import { BookmarkPlus, MoveRight, Trophy } from "lucide-react";
import { Badge, Container, SectionHeader } from "@/components/ui";

const steps: { icon: LucideIcon; label: string; title: string; body: string }[] = [
  {
    icon: BookmarkPlus,
    label: "Capture",
    title: "Save the role",
    body: "Paste a link or use the browser button. Bigfoot creates a card with the details filled in.",
  },
  {
    icon: MoveRight,
    label: "Progress",
    title: "Move it forward",
    body: "Log applications, schedule interviews and prep on the card. Reminders keep every lead moving.",
  },
  {
    icon: Trophy,
    label: "Decide",
    title: "Compare offers",
    body: "Put offers side by side on salary, equity and team fit, then accept with confidence.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="py-24">
      <Container>
        <SectionHeader
          id="how-title"
          eyebrow="How it works"
          title="From saved role to signed offer in three moves"
          lead="Setup takes under two minutes. Import a CSV from your old spreadsheet or start fresh."
        />
        <ol className="m-0 grid list-none grid-cols-1 gap-8 p-0 lg:grid-cols-3">
          {steps.map(({ icon: Icon, label, title, body }) => (
            <li key={title} className="card flex flex-col items-center p-8 text-center">
              {/* Icon shape XL circle: 56px container, 28px icon */}
              <span className="icon-shape mb-6 size-14 rounded-full">
                <Icon className="size-7" aria-hidden />
              </span>
              <Badge tone="brand" pill>
                {label}
              </Badge>
              <h3 className="m-0 mt-4 mb-2 text-base font-medium leading-[1.25] text-heading lg:text-xl">
                {title}
              </h3>
              <p className="m-0 max-w-[40ch] text-base leading-[1.7] text-body">{body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
