import { addons } from "storybook/manager-api";
import { themes } from "storybook/theming";

// Storybook's own interface (sidebar, toolbar, panels) is dark, like the stories it shows.
addons.setConfig({ theme: themes.dark });
