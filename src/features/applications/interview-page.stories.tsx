import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { prepLookBack, takeawayShowsOn, type Application } from "@/lib/applications";
import { expectBigfootClear } from "@/test/art";
import {
  applications,
  brightwater,
  DESKTOP,
  harbour,
  lumen,
  MOBILE,
  NARROW,
  northwind,
  PAGE,
  unscheduledApplications,
  user,
} from "@/test/pages";
import { InterviewNotFoundPage, InterviewPage, InterviewPageSkeleton } from "./interview-page";

// An Interview's page, whole, as /applications/[id]/interviews/[interviewId] renders it (BIG-203),
// at a laptop's width and a phone's. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts); "today" is fixed (src/test/pages.ts). The look back
// and where a takeaway shows are worked out from every Application, as the route does.

/** The page's props for `app`'s Interview `id`, as the route works them out. */
function page(app: Application, id: string, all = applications) {
  const interview = app.interviews.find((i) => i.id === `${app.id}-${id}`)!;
  return {
    app,
    interview,
    lookBack: interview.completed ? undefined : prepLookBack(all, app, interview),
    showsOn: takeawayShowsOn(all, app, interview),
  };
}

/** Bigfoot (BIG-228): "question-sign" on Interview not found, "notebook" and "writing" in the empty notes cards. */
type Art = "question-sign" | "notebook" | "writing";
const ART: Art[] = ["question-sign", "notebook", "writing"];

/**
 * `story`, also checking that the `shown` art is visible, clear of text and controls, and the rest is
 * absent (listed in ART's order). A phone shows the same art as a laptop, smaller (BIG-232).
 */
const withArt = (story: Story, shown: Art[]): Story => ({
  ...story,
  play: async (context) => {
    await story.play?.(context);
    const visible = (name: Art) =>
      context.canvasElement.querySelector<HTMLImageElement>(`img[src*="bigfoot-${name}"]`)?.checkVisibility() ?? false;
    await expect(ART.filter(visible)).toEqual(shown);
    await Promise.all(shown.map((name) => expectBigfootClear(context.canvasElement, `bigfoot-${name}`)));
  },
});
/** The same story in the light theme. */
const LIGHT = { globals: { ...DESKTOP.globals, theme: "light" } } satisfies Story;

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
export const UpcomingDesktop: Story = { ...withArt(upcoming, ["writing"]), ...DESKTOP };
export const UpcomingMobile: Story = { ...withArt(upcoming, ["writing"]), ...MOBILE };

/** Upcoming, with nothing written yet and nothing to look back on: Bigfoot in both cards, smaller on a phone. */
const upcomingEmpty: Story = { args: page(northwind, "onsite") };
export const UpcomingEmptyDesktop: Story = { ...withArt(upcomingEmpty, ["notebook", "writing"]), ...DESKTOP };
export const UpcomingEmptyLight: Story = { ...withArt(upcomingEmpty, ["notebook", "writing"]), ...LIGHT };
export const UpcomingEmptyMobile: Story = { ...withArt(upcomingEmpty, ["notebook", "writing"]), ...MOBILE };
/** The narrowest phone, 320px: each Bigfoot beside its card's button. */
export const UpcomingEmptyNarrow: Story = { ...withArt(upcomingEmpty, ["notebook", "writing"]), ...NARROW };

/** Completed, with Interview notes and a Takeaway for next time, and where that takeaway shows. */
const completed: Story = {
  args: page(lumen, "manager"),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(/Lead with the decision, then the trade-off/).length).toBeGreaterThan(0);
  },
};
export const CompletedDesktop: Story = { ...withArt(completed, []), ...DESKTOP };
export const CompletedMobile: Story = { ...withArt(completed, []), ...MOBILE };

/** Completed with no notes: "How did it go?" with the three fields open. */
const noNotes: Story = {
  args: page(northwind, "screen"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "How did it go?" })).toBeVisible();
  },
};
export const NoNotesDesktop: Story = { ...withArt(noNotes, []), ...DESKTOP };
export const NoNotesMobile: Story = { ...withArt(noNotes, []), ...MOBILE };

/** An Interview of a Done (Rejected) Application. */
const ofDone: Story = { args: page(brightwater, "deep-dive") };
export const OfDoneApplicationDesktop: Story = { ...ofDone, ...DESKTOP };
export const OfDoneApplicationMobile: Story = { ...ofDone, ...MOBILE };

/** A deleted Interview, a malformed id or another job seeker's: Bigfoot right of the title, smaller on a phone. */
const notFound: Story = {
  render: () => <InterviewNotFoundPage user={user} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Interview not found" })).toBeVisible();
  },
};
export const NotFoundDesktop: Story = { ...withArt(notFound, ["question-sign"]), ...DESKTOP };
export const NotFoundLight: Story = { ...withArt(notFound, ["question-sign"]), ...LIGHT };
export const NotFoundMobile: Story = { ...withArt(notFound, ["question-sign"]), ...MOBILE };
/** The narrowest phone, 320px: the title wraps short of Bigfoot. */
export const NotFoundNarrow: Story = { ...withArt(notFound, ["question-sign"]), ...NARROW };

/** While the Interview loads. */
const loading: Story = { render: () => <InterviewPageSkeleton /> };
export const LoadingDesktop: Story = { ...loading, ...DESKTOP };
export const LoadingMobile: Story = { ...loading, ...MOBILE };

/**
 * Unscheduled (BIG-221): "Date TBD" where the date would be, "Upcoming · date TBD", the strip's
 * dashed segment ("Round 3 of 3 · Date TBD" on a phone), and Prep notes headed "Get ready".
 */
const dateTbd: Story = {
  args: page(harbour, "leadership", unscheduledApplications),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Upcoming · date TBD")).toBeVisible();
    await expect(canvas.getByText("Get ready")).toBeVisible();
  },
};
export const DateTbdDesktop: Story = { ...withArt(dateTbd, ["writing"]), ...DESKTOP };
export const DateTbdMobile: Story = { ...withArt(dateTbd, ["writing"]), ...MOBILE };

/** Opened from Add the date (BIG-221): Edit details is open, Date TBD on, ready for the date. */
const addTheDate: Story = {
  args: { ...page(harbour, "leadership", unscheduledApplications), editDetails: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch", { name: "Date TBD" })).toBeChecked();
  },
};
export const AddTheDateDesktop: Story = { ...addTheDate, ...DESKTOP };
export const AddTheDateMobile: Story = { ...addTheDate, ...MOBILE };
