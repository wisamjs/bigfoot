import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { prepLookBack, takeawayShowsOn, type Application } from "@/lib/applications";
import { applications, brightwater, DESKTOP, lumen, MOBILE, northwind, PAGE, user } from "@/test/pages";
import { InterviewNotFoundPage, InterviewPage, InterviewPageSkeleton } from "./interview-page";

// An Interview's page, whole, as /applications/[id]/interviews/[interviewId] renders it (BIG-203),
// at a laptop's width and a phone's. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts); "today" is fixed (src/test/pages.ts). The look back
// and where a takeaway shows are worked out from every Application, as the route does.

/** The page's props for `app`'s Interview `id`, as the route works them out. */
function page(app: Application, id: string) {
  const interview = app.interviews.find((i) => i.id === `${app.id}-${id}`)!;
  return {
    app,
    interview,
    lookBack: interview.completed ? undefined : prepLookBack(applications, app, interview),
    showsOn: takeawayShowsOn(applications, app, interview),
  };
}

const meta = {
  title: "Pages/Interview",
  component: InterviewPage,
  args: { user, ...page(lumen, "deep-dive") },
  ...PAGE,
} satisfies Meta<typeof InterviewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In two days: Prep notes, the takeaways that apply, and They asked last time. */
const upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Lumen Bio" })).toBeVisible();
    await expect(canvas.getByText("Draw the system before talking through it.")).toBeVisible();
  },
};
export const UpcomingDesktop: Story = { ...upcoming, ...DESKTOP };
export const UpcomingMobile: Story = { ...upcoming, ...MOBILE };

/** Upcoming, with nothing written yet and nothing to look back on. */
const upcomingEmpty: Story = { args: page(northwind, "onsite") };
export const UpcomingEmptyDesktop: Story = { ...upcomingEmpty, ...DESKTOP };
export const UpcomingEmptyMobile: Story = { ...upcomingEmpty, ...MOBILE };

/** Completed, with Interview notes and a Takeaway for next time, and where that takeaway shows. */
const completed: Story = {
  args: page(lumen, "manager"),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(/Lead with the decision, then the trade-off/).length).toBeGreaterThan(0);
  },
};
export const CompletedDesktop: Story = { ...completed, ...DESKTOP };
export const CompletedMobile: Story = { ...completed, ...MOBILE };

/** Completed with no notes: "How did it go?" with the three fields open. */
const noNotes: Story = {
  args: page(northwind, "screen"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "How did it go?" })).toBeVisible();
  },
};
export const NoNotesDesktop: Story = { ...noNotes, ...DESKTOP };
export const NoNotesMobile: Story = { ...noNotes, ...MOBILE };

/** An Interview of a Done (Rejected) Application. */
const ofDone: Story = { args: page(brightwater, "deep-dive") };
export const OfDoneApplicationDesktop: Story = { ...ofDone, ...DESKTOP };
export const OfDoneApplicationMobile: Story = { ...ofDone, ...MOBILE };

/** A deleted Interview, a malformed id or another job seeker's. */
const notFound: Story = {
  render: () => <InterviewNotFoundPage user={user} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Interview not found" })).toBeVisible();
  },
};
export const NotFoundDesktop: Story = { ...notFound, ...DESKTOP };
export const NotFoundMobile: Story = { ...notFound, ...MOBILE };

/** While the Interview loads. */
const loading: Story = { render: () => <InterviewPageSkeleton /> };
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };
