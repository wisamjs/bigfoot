"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { SignInNote } from "@/features/auth/sign-in-note";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/features/shell/theme-toggle";
import { Wordmark } from "@/features/shell/wordmark";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface">
      <Container className="flex h-[72px] items-center justify-between">
        <a href="#top" aria-label="Bigfoot home" className="touch-target rounded-control">
          <Wordmark />
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <Link href="/sign-in" className={`${buttonClasses("tertiary", "sm")} hidden md:inline-flex`}>
            Sign in
          </Link>
          <Link href="/sign-up" className={`${buttonClasses("brand", "sm")} hidden md:inline-flex`}>
            Find your Bigfoot
          </Link>
          <button
            type="button"
            className="btn btn-tertiary size-11 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </Container>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-surface md:hidden">
          <Container className="py-6">
            <div className="flex gap-3">
              <Link href="/sign-in" className={`${buttonClasses("tertiary")} flex-1`}>
                Sign in
              </Link>
              <Link href="/sign-up" className={`${buttonClasses("brand")} flex-1`}>
                Sign up
              </Link>
            </div>
            <SignInNote className="mt-4" />
          </Container>
        </div>
      )}
    </header>
  );
}
