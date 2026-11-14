"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth-button";
import { SignInNote } from "@/components/sign-in-note";
import { Container, Wordmark } from "@/components/ui";

const links = [
  { href: "#features", label: "Features" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface">
      <Container className="flex h-[72px] items-center justify-between">
        <a href="#top" aria-label="Bigfoot home" className="rounded-control">
          <Wordmark />
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="m-0 flex list-none items-center gap-8 p-0">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-control text-base font-medium text-heading transition-colors hover:text-body"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <GoogleAuthButton variant="tertiary" size="sm">
            Sign in
          </GoogleAuthButton>
          <GoogleAuthButton size="sm">Sign up</GoogleAuthButton>
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
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-1 text-base font-medium text-heading hover:text-body"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3 border-t border-line pt-6">
              <GoogleAuthButton variant="tertiary" className="flex-1">
                Sign in
              </GoogleAuthButton>
              <GoogleAuthButton className="flex-1">Sign up</GoogleAuthButton>
            </div>
            <SignInNote className="mt-4" />
          </Container>
        </div>
      )}
    </header>
  );
}
