import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus, Trash2 } from "lucide-react";
import { expect, fn } from "storybook/test";
import { Button } from "./button";
import { buttonClasses } from "./button-classes";

const meta = {
  component: Button,
  args: { children: "Add application", onClick: fn() },
  argTypes: {
    variant: { control: "inline-radio", options: ["brand", "secondary", "tertiary", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Brand: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Cancel" } };
export const Tertiary: Story = { args: { variant: "tertiary", children: "Show done" } };
export const Danger: Story = {
  args: {
    variant: "danger",
    children: (
      <>
        <Trash2 className="size-4" aria-hidden />
        Delete application
      </>
    ),
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus className="size-4" aria-hidden />
        Add application
      </>
    ),
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="xl">
        Extra large
      </Button>
    </div>
  ),
};

/** Every variant under the pointer (storybook-addon-pseudo-states forces :hover). */
export const Hovered: Story = {
  parameters: { pseudo: { hover: true } },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="brand">
        Brand
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
};

/** Focused from the keyboard: the 4px line-brand-subtle ring. */
export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button")).toHaveFocus();
  },
};

/** Faded, and refuses clicks. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Looks disabled but keeps focus: a submit button while its form is pending. */
export const AriaDisabled: Story = { args: { "aria-disabled": true, children: "Saving…" } };

/** A button never wraps its label; long labels widen it. */
export const LongText: Story = {
  args: { children: "Add an Application you applied to through a recruiter last week" },
};

/** `buttonClasses` gives an element that can't be a <Button>, such as a link, the same look. */
export const AsLink: Story = {
  render: () => (
    <a href="#main" className={buttonClasses("secondary")}>
      Skip to main content
    </a>
  ),
};
