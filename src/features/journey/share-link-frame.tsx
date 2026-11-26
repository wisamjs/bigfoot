import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Wordmark } from "@/features/shell/wordmark";

/**
 * The frame of a Share link's pages before the Journey (BIG-197): the wordmark over one centred
 * card, and "Private, view-only link" at the foot. Not a link home: a Viewer has no account here.
 */
export function ShareLinkFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-center px-4 pb-8 pt-10 sm:pt-14">
        <Wordmark tile />
      </header>
      <main id="main" className="flex-1 px-4">
        <div className="card mx-auto flex max-w-[480px] flex-col items-center border-line-brand-subtle p-6 text-center sm:p-8">
          {children}
        </div>
      </main>
      <footer className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-body">
        <Lock className="size-4" aria-hidden />
        Private, view-only link
      </footer>
    </div>
  );
}
