import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Briefcase, CalendarClock, Trophy } from "lucide-react";
import { StatCard } from "./stat-card";

const meta = {
  component: StatCard,
  // A StatCard is a list item: the dashboard shows three in a row.
  render: (args) => (
    <ul className="m-0 grid max-w-xs list-none p-0">
      <StatCard {...args} />
    </ul>
  ),
  args: { icon: Briefcase, label: "Open applications", value: 12, note: "4 waiting on a reply" },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutNote: Story = { args: { icon: Trophy, label: "Offers", value: 1, note: undefined } };

/** The dashboard's row of three. */
export const Row: Story = {
  render: () => (
    <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:gap-6">
      <StatCard icon={Briefcase} label="Open applications" value={12} note="4 waiting on a reply" />
      <StatCard icon={CalendarClock} label="Next interview" value="Tue, Nov 24" note="Technical, Datadog" />
      <StatCard icon={Trophy} label="Offers" value={1} />
    </ul>
  ),
};

/** Long values wrap; they are never cut off. */
export const LongText: Story = {
  args: {
    icon: CalendarClock,
    label: "Next interview, across every Application",
    value: "Wednesday, November 25, 2026",
    note: "Onsite loop with the platform engineering team",
  },
};
