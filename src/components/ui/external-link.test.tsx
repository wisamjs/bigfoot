import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { XSS_URLS } from "@/test/xss";
import { ExternalLink, safeHref } from "./external-link";

describe("safeHref", () => {
  it("keeps http and https URLs", () => {
    expect(safeHref("https://jobs.example.com/1?ref=a#top")).toBe("https://jobs.example.com/1?ref=a#top");
    expect(safeHref(" http://jobs.example.com ")).toBe("http://jobs.example.com/");
  });

  it.each([...XSS_URLS, "/dashboard", "jobs.example.com", "mailto:a@example.com", "", null, undefined])(
    "refuses %j",
    (url) => {
      expect(safeHref(url)).toBeNull();
    },
  );
});

describe("ExternalLink", () => {
  it("opens in a new tab without access to this one or the referrer", () => {
    render(<ExternalLink href="https://jobs.example.com">Posting</ExternalLink>);
    const link = screen.getByRole("link", { name: "Posting" });
    expect(link).toHaveAttribute("href", "https://jobs.example.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each(XSS_URLS)("renders no link for %j", (url) => {
    render(<ExternalLink href={url}>Posting</ExternalLink>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
