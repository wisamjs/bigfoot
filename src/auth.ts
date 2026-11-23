import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SESSION_MAX_AGE_DAYS } from "@/lib/session";

// Google credentials are read from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET,
// and the session cookie is encrypted with AUTH_SECRET (see .env.example).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60 },
  pages: {
    // Send sign-in prompts to the sign-in page and auth errors back to the landing page.
    signIn: "/sign-in",
    error: "/",
  },
  callbacks: {
    // Records the job seeker, and the first time gives them Sample Applications, once per sign-in
    // (docs/adr/0006). A failure stops the sign-in, which lands on the landing page to try again,
    // so nobody reaches an empty Dashboard that was never set up. Imported here, not at the top,
    // so the proxy's bundle (which also loads this file) doesn't carry the API client.
    async signIn({ account }) {
      if (!account?.providerAccountId) return false;
      const { onboard } = await import("@/lib/api");
      await onboard(account.providerAccountId);
      return true;
    },
    // token.sub is the Google account id: the stable job seeker id their Applications belong to.
    // Without a database adapter Auth.js sets user.id (and so token.sub) to a fresh random
    // UUID on every sign-in, so pin it to Google's own id instead.
    jwt({ token, account }) {
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
