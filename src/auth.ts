import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google credentials are read from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET,
// and the session cookie is encrypted with AUTH_SECRET (see .env.example).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    // Send sign-in prompts and auth errors back to the landing page.
    signIn: "/",
    error: "/",
  },
  callbacks: {
    // token.sub is the Google account id: the stable owner of the job seeker's Applications.
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
