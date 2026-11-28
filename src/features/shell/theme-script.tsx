"use client";

import { useLayoutEffect } from "react";
import { THEME_SCRIPT, restoreTheme } from "./theme";

/**
 * The root layout's theme script (BIG-251), in <head>: it sets the mode before the first paint
 * (theme.ts). React warns about a <script> it renders on the client, so the client's copy is inert
 * text, and suppressHydrationWarning keeps the server's. Its layout effect puts the mode back after
 * React's development remount clears it.
 */
export function ThemeScript() {
  useLayoutEffect(restoreTheme, []);
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- THEME_SCRIPT is a constant in theme.ts, with nothing from a request or a job seeker in it.
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
