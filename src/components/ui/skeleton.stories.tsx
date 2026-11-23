import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingRegion, Skeleton } from "./skeleton";

const meta = {
  component: Skeleton,
  args: { className: "block h-5 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A card's loading state: the heading stays real, only the data is shapes. */
export const InLoadingRegion: Story = {
  render: () => (
    <LoadingRegion label="Loading your Applications">
      <div className="card flex max-w-md flex-col gap-3 p-6">
        <h2 className="m-0 text-xl font-bold text-heading">Applications</h2>
        <Skeleton className="block h-5 w-2/3" />
        <Skeleton className="block h-4 w-1/2" />
        <Skeleton className="block h-4 w-5/6" />
      </div>
    </LoadingRegion>
  ),
};
