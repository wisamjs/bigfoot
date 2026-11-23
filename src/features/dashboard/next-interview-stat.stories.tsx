import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { previewApplications } from "@/lib/mock-data";
import type { DatedInterview } from "@/lib/applications";
import { NextInterviewStat } from "./next-interview-stat";

// The dashboard's Next Interview stat, for an Interview from the landing page's sample data.
const application = previewApplications.find((a) => a.id === "figma")!;
const upcoming = application.interviews.find((i) => !i.completed)!;
const next: DatedInterview = {
  application,
  interview: { ...upcoming, at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
};

const meta = {
  component: NextInterviewStat,
  args: { next },
  // The dashboard lists its stats, so a stat card is a list item.
  decorators: [(Story) => <ul className="m-0 grid max-w-xs list-none p-0">{Story()}</ul>],
} satisfies Meta<typeof NextInterviewStat>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The soonest upcoming Interview: its company, kind and when. */
export const Default: Story = {};

/** No upcoming Interviews. */
export const None: Story = { args: { next: null } };

export const LongText: Story = {
  args: {
    next: {
      ...next,
      application: { ...application, company: "Northern Lights Software Engineering Co-operative of British Columbia" },
    },
  },
};
