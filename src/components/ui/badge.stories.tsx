import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, toneClasses, type Tone } from "./badge";

const tones = Object.keys(toneClasses) as Tone[];

const meta = {
  component: Badge,
  args: { children: "Technical", tone: "neutral", pill: false },
  argTypes: { tone: { control: "select", options: tones } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pill: Story = { args: { pill: true, children: "Sample" } };

/** badges.md's variants, then the Round and Stage colours. */
export const AllTones: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {tones.map((tone) => (
        <Badge key={tone} {...args} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};

/** Badges don't truncate: a long label wraps inside a narrow parent. */
export const LongText: Story = {
  args: { tone: "purple", children: "Hiring manager conversation with the VP of Engineering" },
  decorators: [(Story) => <div className="max-w-48">{Story()}</div>],
};

/** Led by a dot in the label's colour, on one line, as the dashboard's Progress labels are (BIG-195). */
export const WithDot: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Badge {...args} tone="warning" pill dot nowrap>
        Waiting · 13 days
      </Badge>
      <Badge {...args} tone="blue" pill dot nowrap>
        Interview scheduled
      </Badge>
      <Badge {...args} tone="success" pill dot nowrap>
        Offer
      </Badge>
    </div>
  ),
};
