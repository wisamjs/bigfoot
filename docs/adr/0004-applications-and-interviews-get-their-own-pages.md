# Applications and Interviews get their own pages; the side panel goes away

The dashboard opened an Application in a side panel beside it, and added one in the same panel. That panel holds every detail, the Status, the Outcome, and every Interview with its Interview notes, so it grows crowded. On a phone there is no room for a panel beside anything, and a flow that stacks a picker or calendar over a panel over the dashboard is hard to use there. We decided that adding, reading, and editing an Application or an Interview each happen on a page of its own (`/applications/new`, `/interviews/new`, then `/applications/[id]` and an Interview's page), and that the side panel is removed once those pages exist.

Pages can be linked to and work with Back, and they give a phone flow of one screen at a time: open, edit, go back. The cost is moving between the dashboard and a page instead of keeping the dashboard in view, and rebuilding what the panel does today (unsaved changes on close, saving on leaving a field, showing Interviews first) on the pages instead.

## Consequences

- Adding comes first: Add Application and Add Interview are pages before the Application page exists. Until then, adding goes back to the dashboard; afterwards, adding an Application opens its page.
- Work planned for the panel targets the Application page instead.
