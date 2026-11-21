import Link from "next/link";
import { Container } from "@/components/ui/container";

// Legal links for signed-in pages, which are too busy for the landing Footer.
const links = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
];

export function AppFooter() {
  return (
    <footer className="border-t border-line py-6">
      <Container>
        <ul className="m-0 flex list-none flex-wrap justify-end gap-6 p-0 text-sm leading-[1.6] text-body">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-control underline underline-offset-4 transition-colors hover:text-heading"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
