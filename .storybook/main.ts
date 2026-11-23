import type { StorybookConfig } from "@storybook/nextjs-vite";

// Storybook for the design system (src/components/ui) and a few feature components (BIG-8).
// Stories sit beside their component as <name>.stories.tsx; the token page is .storybook/tokens.mdx.
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["./*.mdx", "../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest", "storybook-addon-pseudo-states"],
  core: { disableTelemetry: true },
  // Next.js compiles globals.css with @tailwindcss/turbopack (next.config.ts); Vite needs
  // Tailwind's own plugin for the same utilities.
  viteFinal: async (viteConfig) => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
