import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertEnv, envProblems, OPTIONAL_ENV, REQUIRED_ENV } from "./env";

const COMPLETE = {
  AUTH_SECRET: "secret",
  AUTH_GOOGLE_ID: "google-id",
  AUTH_GOOGLE_SECRET: "google-secret",
  API_SECRET: "api-secret",
  API_URL: "https://api.example.com",
};

function without(...names: (keyof typeof COMPLETE)[]) {
  return Object.fromEntries(Object.entries(COMPLETE).filter(([name]) => !names.includes(name as keyof typeof COMPLETE)));
}

describe("envProblems", () => {
  it("finds nothing wrong with a complete environment", () => {
    expect(envProblems(COMPLETE)).toEqual([]);
    expect(() => assertEnv(COMPLETE)).not.toThrow();
  });

  it("names one missing variable", () => {
    expect(envProblems(without("API_SECRET"))).toEqual(["Missing: API_SECRET (see .env.example)"]);
  });

  it("counts a blank variable as missing", () => {
    expect(envProblems({ ...COMPLETE, AUTH_SECRET: " " })).toEqual(["Missing: AUTH_SECRET (see .env.example)"]);
  });

  it("names every missing variable in one message", () => {
    expect(() => assertEnv({})).toThrow(
      "Missing: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, API_SECRET, API_URL (see .env.example)",
    );
  });

  it.each(["http://localhost:8000", "http://127.0.0.1:8000", "http://[::1]:8000", "http://api.localhost"])(
    "rejects the localhost API_URL %s in production only",
    (API_URL) => {
      expect(envProblems({ ...COMPLETE, API_URL, VERCEL_ENV: "production" })).toEqual([
        `API_URL must not be a localhost address in production (it is ${API_URL})`,
      ]);
      expect(envProblems({ ...COMPLETE, API_URL, VERCEL_ENV: "preview" })).toEqual([]);
      expect(envProblems({ ...COMPLETE, API_URL })).toEqual([]);
    },
  );

  it("rejects API_DOCS=true in production only", () => {
    expect(envProblems({ ...COMPLETE, API_DOCS: "True", VERCEL_ENV: "production" })).toEqual([
      "API_DOCS must not be true in production",
    ]);
    expect(envProblems({ ...COMPLETE, API_DOCS: "false", VERCEL_ENV: "production" })).toEqual([]);
    expect(envProblems({ ...COMPLETE, API_DOCS: "true" })).toEqual([]);
  });

  it("reports missing variables and production rules together", () => {
    const env = { ...without("AUTH_SECRET"), API_URL: "http://localhost:8000", API_DOCS: "true", VERCEL_ENV: "production" };
    expect(() => assertEnv(env)).toThrow(
      [
        "Invalid environment variables:",
        "- Missing: AUTH_SECRET (see .env.example)",
        "- API_URL must not be a localhost address in production (it is http://localhost:8000)",
        "- API_DOCS must not be true in production",
      ].join("\n"),
    );
  });
});

describe(".env.example", () => {
  const root = new URL("../../", import.meta.url);
  const documented = [...readFileSync(new URL(".env.example", root), "utf8").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(
    (match) => match[1],
  );
  // The API's list, read from its source: the two services share .env.example.
  const settings = readFileSync(new URL("api/app/settings.py", root), "utf8");
  const apiRequired = [...(settings.match(/^REQUIRED_ENV = \((.*)\)$/m)?.[1] ?? "").matchAll(/"([A-Z0-9_]+)"/g)].map(
    (match) => match[1],
  );

  it("reads the API's required variables", () => {
    expect(apiRequired).toContain("DATABASE_URL");
  });

  it("documents exactly the variables the two services declare", () => {
    const declared = new Set([...REQUIRED_ENV, ...OPTIONAL_ENV, ...apiRequired]);
    expect([...documented].sort()).toEqual([...declared].sort());
  });
});
