import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { ApplicationEditor } from "./application-editor";

// The Application page's body, for Applications from the landing page's sample data. Server
// Actions are mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const datadog = previewApplications.find((app) => app.id === "datadog")!;
const ramp = previewApplications.find((app) => app.id === "ramp")!;

const meta = {
  component: ApplicationEditor,
  args: { app: datadog },
  // What the Application page puts around the editor: a region named for the company.
  decorators: [
    (Story, { args }) => (
      <main className="max-w-2xl">
        <section aria-label={args.app.company}>{Story()}</section>
      </main>
    ),
  ],
} satisfies Meta<typeof ApplicationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In Progress, with a completed Interview and an upcoming one. */
export const Default: Story = {};

/**
 * Many Interviews, each a row that opens its Interview page: past ones muted, the next one marked
 * Next, the first line of any Interview notes, and Date needed for one with no date.
 */
export const ManyInterviews: Story = {
  args: {
    app: {
      ...datadog,
      interviews: [
        ...datadog.interviews.map((interview, i) =>
          i === 0 ? { ...interview, notes: "Friendly. Asked why I left my last role.\nFollow up next week." } : interview,
        ),
        ...["2026-12-08T17:00:00Z", "2026-12-15T17:00:00Z", "2026-12-22T17:00:00Z"].map((at, i) => ({
          ...datadog.interviews[0],
          id: `later-${i}`,
          kind: (["behavioural", "leadership", "onsite_loop"] as const)[i],
          at,
          notes: i === 1 ? "A very long first line of Interview notes that goes on and on past the edge of the row so it has to be cut short" : null,
          completed: false,
        })),
        { ...datadog.interviews[0], id: "undated", kind: "people_management" as const, at: null, notes: null, completed: true },
      ],
    },
  },
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole("link", { name: /^Open Interview: / });
    await expect(rows.at(-1)).toHaveAccessibleName(/Date needed/);
    await expect(rows[0]).toHaveAttribute("href", expect.stringMatching(/^\/applications\/datadog\/interviews\//));
  },
};

/** Done with an Offer. */
export const Offer: Story = { args: { app: ramp } };

/** Opened straight after adding the Application: the Interview list asks for the first Interview. */
export const JustAdded: Story = {
  args: { app: { ...datadog, interviews: [] }, justAdded: true },
};

/** A typed detail saves when it's left. */
export const SaveDetail: Story = {
  play: async ({ canvas, userEvent }) => {
    const posting = canvas.getByRole("textbox", { name: /^Job posting URL/ });
    await userEvent.clear(posting);
    await userEvent.type(posting, "https://careers.example.com/1");
    await userEvent.tab();
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith(
        "datadog",
        expect.objectContaining({ posting_url: "https://careers.example.com/1" }),
      ),
    );
  },
};

/** Picking Hybrid saves it at once and asks for days in office; picking a day saves it too. */
export const PickHybrid: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Hybrid" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("datadog", { location: "hybrid" }),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "3 days a week" }));
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith("datadog", { location: "hybrid", office_days: 3 }),
    );
  },
};

/** A detail that isn't valid shows its error and isn't sent. */
export const DetailError: Story = {
  play: async ({ canvas, userEvent }) => {
    const posting = canvas.getByRole("textbox", { name: /^Job posting URL/ });
    await userEvent.clear(posting);
    await userEvent.type(posting, "not a link");
    await userEvent.tab();
    await expect(posting).toHaveAttribute("aria-invalid", "true");
    await expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  },
};

/** The server refuses a save: the error and a Retry show beside the field. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "In-Office" }));
    await expect(await canvas.findByRole("button", { name: "Retry, Location" })).toBeVisible();
  },
};

export const LongText: Story = {
  args: {
    app: {
      ...datadog,
      company: "Northern Lights Software Engineering Co-operative of British Columbia",
      title: "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
      location: "hybrid",
      office_days: 4,
      posting_url: "https://example.com/careers/engineering/platform/senior-staff-software-engineer-developer-experience",
    },
  },
};
