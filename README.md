# Bigfoot

A calm job search tracker. Bigfoot keeps every Application in one Pipeline, from the role you just saved to the offer on your desk, so nothing lives in a spreadsheet or a forgotten email thread.

![Bigfoot landing page](docs/screenshots/landing.png)

## Status

Bigfoot is an early proof of concept, built as a side project.

**Works today**

- Landing page
- Sign in with Google
- A dashboard with stats, the Pipeline board, a table of all Applications and upcoming next steps

**Not built yet**

The dashboard shows the same demo Pipeline to everyone who signs in: there is no database, so nothing you do is saved. These features appear on the landing page but are still planned:

- Adding, editing and moving Applications between Stages
- Interview prep notes
- Follow-up reminders
- Contacts and referrals
- Search analytics
- One-click capture from a job link

![Bigfoot dashboard with demo data](docs/screenshots/dashboard.png)

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) and React 19
- [Auth.js](https://authjs.dev) with Google sign-in and encrypted cookie sessions
- [Tailwind CSS 4](https://tailwindcss.com), with every design token defined in [`src/app/globals.css`](src/app/globals.css)
- TypeScript throughout

## Run it locally

You need Node.js 24 and a Google account.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/wisamjs/bigfoot.git
   cd bigfoot
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Generate a session secret and paste it into `AUTH_SECRET` in `.env.local`:

   ```bash
   openssl rand -base64 33
   ```

4. Create a Google OAuth client:
   1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
   2. Create an **OAuth client ID** of type **Web application**.
   3. Add `http://localhost:3300/api/auth/callback/google` as an authorized redirect URI.
   4. Paste the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env.local`.

5. Start the dev server on port 3300 (the port the redirect URI expects):

   ```bash
   npm run dev -- -p 3300
   ```

6. Open [http://localhost:3300](http://localhost:3300) and sign in.

### Skip Google sign-in

To see the dashboard without setting up Google (step 4), you only need `AUTH_SECRET`. Generate a session cookie for a test user:

```bash
node scripts/dev-session.mjs
```

In your browser's developer tools, add a cookie named `authjs.session-token` for `localhost` with that value, then open [http://localhost:3300/dashboard](http://localhost:3300/dashboard).

## Quality checks

| Command | What it checks |
| --- | --- |
| `npm run check` | Types, lint, and that components use design tokens instead of raw colors and corner radii |
| `npm run smoke` | Loads every route signed in and signed out against the running dev server, and fails on any server error |
| `npm run build` | Production build (stop `next dev` first: they share `.next/`) |

[CI](.github/workflows/ci.yml) runs all three on every push and pull request.

## How it was built

Bigfoot was built with AI coding agents working from the project rules in [`AGENTS.md`](AGENTS.md).

[`GLOSSARY.md`](GLOSSARY.md) defines the product's terms (Application, Stage, Pipeline, Next step).

## License

[MIT](LICENSE) © 2026 Wisam Zaghal
