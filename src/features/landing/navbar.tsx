"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { SignInNote } from "@/features/auth/signInNote";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/features/shell/wordmark";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface">
      <Container className="flex h-[72px] items-center justify-between">
        <a href="#top" aria-label="Bigfoot home" className="touch-target rounded-control">
          <Wordmark />
        </a>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-in" className={buttonClasses("tertiary", "sm")}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonClasses("brand", "sm")}>
            Find your Bigfoot
          </Link>
        </div>

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
