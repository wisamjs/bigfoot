import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";
import { toCurrentUser } from "./current-user";

function session(user: Partial<Session["user"]>): Session {
  return { user, expires: "2026-12-25T00:00:00Z" } as Session;
}

describe("toCurrentUser", () => {
  it("names the job seeker a session belongs to", () => {
    expect(
      toCurrentUser(session({ id: "g-1", name: "Wisam Zaghal", email: "wisam@example.com", image: "https://img.example/w.png" })),
    ).toEqual({
      id: "g-1",
      name: "Wisam Zaghal",
      firstName: "Wisam",
      email: "wisam@example.com",
      image: "https://img.example/w.png",
    });
  });

  it("falls back to the email for a job seeker with no name, and to no image", () => {
    expect(toCurrentUser(session({ id: "g-1", email: "wisam@example.com" }))).toEqual({
      id: "g-1",
      name: "wisam@example.com",
      firstName: "wisam@example.com",
      email: "wisam@example.com",
      image: null,
    });
  });

  it.each([
    ["no session", null],
    ["a session with no user", { expires: "2026-12-25T00:00:00Z" } as Session],
    ["a user with no email", session({ id: "g-1", name: "Wisam" })],
    ["a user with no id", session({ email: "wisam@example.com" })],
  ])("is null for %s", (_, value) => {
    expect(toCurrentUser(value)).toBeNull();
  });
});
