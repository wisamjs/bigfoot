// Where the Pages snapshots live and how they are written: docs/snapshots/<page>/<state>-<theme>.png.
// The story tests (.storybook/snapshots.ts) send each picture here through a Vitest browser command
// (vitest.config.mts); scripts/snapshots.mjs removes the ones whose story is gone.
// A picture is rewritten only when a pixel changed, so a commit that doesn't touch a page leaves its
// snapshots as they were: the story tests' Chrome draws the same pixels every run (its flags in
// vitest.config.mts). Pictures are stored losslessly at PNG's highest compression, under half the
// size Chrome writes them, and compared after the same compression, as sharp shifts some shades.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";
import sharp from "sharp";

export const ROOT = resolve(import.meta.dirname, "..");
export const SNAPSHOT_DIR = join(ROOT, "docs/snapshots");

/**
 * The story files under `root`/src whose title starts with Pages/, relative to `root`.
 * @param {string} root
 */
export function pagesStoryFiles(root = ROOT) {
  return readdirSync(join(root, "src"), { recursive: true })
    .filter((path) => path.endsWith(".stories.tsx"))
    .filter((path) => /title:\s*"Pages\//.test(readFileSync(join(root, "src", path), "utf8")))
    .map((path) => join("src", path))
    .sort();
}

/**
 * The snapshot's path under SNAPSHOT_DIR, from a Pages story's id: `pages-dashboard--in-flight-mobile`
 * in dark is `dashboard/in-flight-mobile-dark.png`. Any other story has none.
 * @param {string} storyId
 * @param {"dark" | "light"} theme
 * @returns {string | null}
 */
export function snapshotPath(storyId, theme) {
  const match = /^pages-([a-z0-9-]+)--([a-z0-9-]+)$/.exec(storyId);
  return match ? `${match[1]}/${match[2]}-${theme}.png` : null;
}

/**
 * How many pixels differ between two PNGs; Infinity when their sizes differ.
 * @param {Buffer} a
 * @param {Buffer} b
 */
export function changedPixels(a, b) {
  const one = PNG.sync.read(a);
  const two = PNG.sync.read(b);
  if (one.width !== two.width || one.height !== two.height) return Infinity;
  let changed = 0;
  for (let i = 0; i < one.data.length; i += 4) {
    if (one.data.readUInt32BE(i) !== two.data.readUInt32BE(i)) changed++;
  }
  return changed;
}

/**
 * `png` at PNG's highest lossless compression.
 * @param {Buffer} png
 */
export function compress(png) {
  return sharp(png).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer();
}

/**
 * Writes `png`, compressed, to `path` under `dir` unless the file there has the same pixels, and
 * notes the path and what happened in the log file `log` (`<path> <result>` per line).
 * @param {string} path relative to `dir`, from snapshotPath
 * @param {Buffer} png
 * @param {{ dir?: string, log?: string, width?: number }} options `width`: the story's width in pixels;
 *   a picture of another width was scaled, and is refused
 * @returns {Promise<"added" | "changed" | "unchanged">}
 */
export async function saveSnapshot(path, png, { dir = SNAPSHOT_DIR, log, width } = {}) {
  const file = join(dir, path);
  if (relative(dir, file).startsWith("..")) throw new Error(`Snapshot outside ${dir}: ${path}`);
  const actual = PNG.sync.read(png).width;
  if (width !== undefined && actual !== width) throw new Error(`${path} is ${actual}px wide, not ${width}px: the picture was scaled`);
  const existed = existsSync(file);
  const small = await compress(png);
  let result = "unchanged";
  if (!existed || changedPixels(readFileSync(file), small) > 0) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, small);
    result = existed ? "changed" : "added";
  }
  if (log) appendFileSync(log, `${path} ${result}\n`);
  return result;
}

/**
 * Deletes every PNG under `dir` not in `keep`, then any folder left empty.
 * @param {Set<string>} keep paths relative to `dir`
 * @param {string} dir
 * @returns {string[]} the paths removed
 */
export function prune(keep, dir = SNAPSHOT_DIR) {
  if (!existsSync(dir)) return [];
  const removed = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".png")) continue;
    const path = relative(dir, join(entry.parentPath, entry.name));
    if (!keep.has(path)) {
      rmSync(join(dir, path));
      removed.push(path);
    }
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const folder = join(dir, entry.name);
    if (entry.isDirectory() && readdirSync(folder).length === 0) rmdirSync(folder);
  }
  return removed.sort();
}
