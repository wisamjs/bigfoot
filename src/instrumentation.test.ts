import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "./instrumentation";

afterEach(() => vi.unstubAllEnvs());

describe("register", () => {
  it("stops a production server whose environment has a gap", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(register).toThrow(/Missing: .*AUTH_SECRET/);
  });

  it("stops a Vercel Production function whose environment has a gap", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(register).toThrow(/Missing: .*AUTH_SECRET/);
  });

  it("doesn't check a Vercel Preview deployment, which has no secrets", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("AUTH_SECRET", "");
    expect(register).not.toThrow();
  });

  it("doesn't check in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "");
    expect(register).not.toThrow();
  });
});
