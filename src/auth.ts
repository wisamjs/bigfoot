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
});
