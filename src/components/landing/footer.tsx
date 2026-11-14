import Link from "next/link";
import { Container, Wordmark } from "@/components/ui";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container>
        <div className="grid grid-cols-1 gap-12 pt-16 pb-12 md:grid-cols-[2fr_repeat(2,1fr)]">
          <div className="max-w-sm">
            <Link href="/#top" aria-label="Bigfoot home" className="mb-4 inline-block rounded-control">
              <Wordmark />
            </Link>
            <p className="m-0 text-base leading-[1.7] text-body">
              Job hunting is chasing Bigfoot. Track every application until you find yours.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="m-0 mb-4 text-sm font-medium uppercase tracking-[0.4px] text-heading">
                {col.title}
              </h2>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="rounded-control text-base text-body transition-colors hover:text-heading"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-line py-6 text-sm leading-[1.6] text-body sm:flex-row sm:justify-between">
          <p className="m-0">
            © 2026 Wisam Zaghal ·{" "}
            <a
              href="https://github.com/wisamjs/bigfoot/blob/main/LICENSE"
              className="rounded-control underline underline-offset-4 transition-colors hover:text-heading"
            >
              MIT License
            </a>
          </p>
          <p className="m-0">Made for job seekers, by job seekers.</p>
        </div>
      </Container>
    </footer>
  );
}
