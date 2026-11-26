import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { jobSeekerTag, scrub, scrubText, sentryEnvironment, tracesSampleRate } from "./sentry";

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl";

describe("scrubText", () => {
  it("replaces emails and JWTs", () => {
    expect(scrubText(`Failed for jane.doe+jobs@example.co.uk with Bearer ${JWT}`)).toBe(
      "Failed for [email] with Bearer [token]",
    );
  });

  it("leaves other text alone", () => {
    expect(scrubText("Application not found")).toBe("Application not found");
  });
});

describe("scrub", () => {
  it("drops cookies, headers, bodies and query strings, and keeps only the user's hashed id", () => {
    const event = {
      type: undefined,
      message: "Error for jane@example.com",
      request: {
        url: "https://bigfoot.example/dashboard",
        cookies: { "authjs.session-token": JWT },
        headers: { authorization: `Bearer ${JWT}` },
        data: { company: "Northwind" },
        query_string: "email=jane@example.com",
      },
      user: { id: "abc123", email: "jane@example.com", ip_address: "203.0.113.7" },
      exception: { values: [{ type: "Error", value: `token ${JWT}` }] },
    } as ErrorEvent;

    expect(scrub(event)).toEqual({
      type: undefined,
      message: "Error for [email]",
      request: { url: "https://bigfoot.example/dashboard" },
      user: { id: "abc123" },
      exception: { values: [{ type: "Error", value: "token [token]" }] },
    });
  });

  it("drops a user without an id", () => {
    expect(scrub({ type: undefined, user: { email: "jane@example.com" } } as ErrorEvent).user).toBeUndefined();
  });

  it("leaves an event with no request or user without them", () => {
    expect(scrub({ type: undefined, message: "Plain" } as ErrorEvent)).toEqual({ type: undefined, message: "Plain" });
  });
});

describe("sentryEnvironment and tracesSampleRate", () => {
  it("names the Vercel environment, or development off Vercel", () => {
    expect(sentryEnvironment({ NEXT_PUBLIC_VERCEL_ENV: "preview" })).toBe("preview");
    expect(sentryEnvironment({ VERCEL_ENV: "production" })).toBe("production");
    expect(sentryEnvironment({})).toBe("development");
  });

  it("keeps every trace locally and a tenth elsewhere", () => {
    expect(tracesSampleRate("development")).toBe(1);
    expect(tracesSampleRate("production")).toBe(0.1);
  });
});

describe("jobSeekerTag", () => {
  it("is the SHA-256 of the job seeker id, matching the API's", async () => {
    // SHA-256 of "123", as in api/tests/test_monitoring.py
    expect(await jobSeekerTag("123")).toBe("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
  });
});
