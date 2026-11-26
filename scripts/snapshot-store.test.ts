import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { changedPixels, pagesStoryFiles, pngWidth, prune, saveSnapshot, snapshotPath } from "./snapshot-store.mjs";

/** A `width`×`height` PNG of one colour, with the pixel at (0, 0) in `dot` if given. */
function png(width: number, height: number, colour = [200, 100, 150], dot?: number[]) {
  const image = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) image.data.set([...(i === 0 && dot ? dot : colour), 255], i * 4);
  return PNG.sync.write(image);
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "snapshot-store-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("snapshotPath", () => {
  it("files a Pages story under its page, named by state and theme", () => {
    expect(snapshotPath("pages-dashboard--in-flight-mobile", "dark")).toBe("dashboard/in-flight-mobile-dark.png");
    expect(snapshotPath("pages-journey--not-active-desktop", "light")).toBe("journey/not-active-desktop-light.png");
  });

  it("has no path for any other story", () => {
    expect(snapshotPath("ui-button--primary", "dark")).toBeNull();
    expect(snapshotPath("pages-dashboard", "dark")).toBeNull();
  });
});

describe("changedPixels", () => {
  it("counts the pixels that differ, however slightly", () => {
    expect(changedPixels(png(4, 4), png(4, 4))).toBe(0);
    expect(changedPixels(png(4, 4), png(4, 4, [200, 100, 150], [201, 100, 150]))).toBe(1);
  });

  it("treats pictures of different sizes as wholly changed", () => {
    expect(changedPixels(png(4, 4), png(4, 5))).toBe(Infinity);
  });
});

describe("pngWidth", () => {
  it("reads the width from the header", () => {
    expect(pngWidth(png(414, 2))).toBe(414);
  });
});

describe("saveSnapshot", () => {
  const path = "dashboard/empty-mobile-dark.png";

  it("adds a new picture, then leaves it alone while its pixels stay the same", () => {
    expect(saveSnapshot(path, png(8, 8), { dir })).toBe("added");
    const written = statSync(join(dir, path)).mtimeMs;
    expect(saveSnapshot(path, png(8, 8), { dir })).toBe("unchanged");
    expect(statSync(join(dir, path)).mtimeMs).toBe(written);
  });

  it("rewrites a picture when one pixel changed", () => {
    saveSnapshot(path, png(8, 8), { dir });
    expect(saveSnapshot(path, png(8, 8, [200, 100, 150], [0, 0, 0]), { dir })).toBe("changed");
    expect(changedPixels(readFileSync(join(dir, path)), png(8, 8, [200, 100, 150], [0, 0, 0]))).toBe(0);
  });

  it("refuses a picture that isn't the expected width, as Vitest scaled it", () => {
    expect(() => saveSnapshot(path, png(8, 8), { dir, width: 828 })).toThrow("8px wide, not 828px");
    expect(existsSync(join(dir, path))).toBe(false);
  });

  it("refuses a path outside the folder", () => {
    expect(() => saveSnapshot("../escape.png", png(8, 8), { dir })).toThrow("outside");
  });

  it("logs each path with what happened, for pruning", () => {
    const log = join(dir, "log.txt");
    saveSnapshot(path, png(8, 8), { dir, log });
    saveSnapshot(path, png(8, 8), { dir, log });
    expect(readFileSync(log, "utf8")).toBe(`${path} added\n${path} unchanged\n`);
  });
});

describe("prune", () => {
  it("removes pictures not kept, and the folders they leave empty", () => {
    for (const path of ["dashboard/a.png", "dashboard/b.png", "gone/c.png"]) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), png(1, 1));
    }
    expect(prune(new Set(["dashboard/a.png"]), dir)).toEqual(["dashboard/b.png", "gone/c.png"]);
    expect(existsSync(join(dir, "dashboard/a.png"))).toBe(true);
    expect(existsSync(join(dir, "gone"))).toBe(false);
  });

  it("does nothing when there is no folder yet", () => {
    expect(prune(new Set(), join(dir, "missing"))).toEqual([]);
  });
});

describe("pagesStoryFiles", () => {
  it("finds the story files titled Pages/, wherever they sit", () => {
    const files = {
      "src/features/dashboard/dashboard-page.stories.tsx": 'const meta = { title: "Pages/Dashboard" };',
      "src/features/journey/journey-preview.stories.tsx": 'const meta = {\n  title: "Pages/Journey",\n};',
      "src/components/ui/button.stories.tsx": 'const meta = { title: "UI/Button" };',
      "src/features/dashboard/dashboard-page.tsx": '// title: "Pages/Dashboard"',
    };
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    expect(pagesStoryFiles(dir)).toEqual([
      "src/features/dashboard/dashboard-page.stories.tsx",
      "src/features/journey/journey-preview.stories.tsx",
    ]);
  });

  it("finds this repo's Pages stories", () => {
    expect(pagesStoryFiles()).toContain("src/features/dashboard/dashboard-page.stories.tsx");
  });
});
