#!/usr/bin/env python3
"""Apply a saved TypeUI MCP result (typeui_install_design_system / typeui_get_started).

Those results are hundreds of KB of JSON, too large to read. This finds the design-skill
package files inside, replaces the project's typeui-design-system folders with them, and
prints a short summary.

    python3 scripts/typeui-apply.py <saved-result-file>
"""

import json
import re
import shutil
import sys
from pathlib import Path

SKILL_DIRS = [".claude/skills/typeui-design-system", ".agents/skills/typeui-design-system"]
# TypeUI writes a description that names no task ("Candy design skill for AI coding agents."), and
# the description is what tells an agent when to load the skill, so it is replaced on every apply.
DESCRIPTION = (
    "Use when writing or restyling UI components, pages, or colours: Bigfoot's TypeUI Candy design"
    " system, with one module per kind of component."
)


def with_description(path, content):
    """Return a SKILL.md's content with DESCRIPTION in its frontmatter; other files unchanged."""
    if Path(path).name != "SKILL.md":
        return content
    return re.sub(r"^description: .*$", f'description: "{DESCRIPTION}"', content, count=1, flags=re.M)


def find_files(node):
    """Return the first list of {path, content} dicts anywhere in the result."""
    if isinstance(node, list):
        if node and all(isinstance(f, dict) and {"path", "content"} <= f.keys() for f in node):
            return node
        for item in node:
            found = find_files(item)
            if found:
                return found
    elif isinstance(node, dict):
        # Prefer the canonical package location before searching everywhere else.
        package = node.get("skillPackage")
        if isinstance(package, dict) and find_files(package.get("files")):
            return package["files"]
        for value in node.values():
            found = find_files(value)
            if found:
                return found
    return None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    result = json.loads(Path(sys.argv[1]).read_text())
    files = find_files(result)
    if not files:
        sys.exit("No design-skill package files found in this result.")

    root = Path.cwd()
    for path in (root / d for d in SKILL_DIRS):
        shutil.rmtree(path, ignore_errors=True)
    for f in files:
        target = (root / f["path"]).resolve()
        if root.resolve() not in target.parents:
            sys.exit(f"Refusing to write outside the project: {f['path']}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(with_description(f["path"], f["content"]))

    names = sorted({Path(f["path"]).name for f in files})
    name_line = next((line for line in result.get("text", "").splitlines() if line.startswith("Prepared")), "")
    print(name_line or "Design skill applied.")
    print(f"Wrote {len(files)} files into {', '.join(SKILL_DIRS)}:")
    print("  " + ", ".join(names))
    print("Read SKILL.md first; it lists which modules to load for each kind of page.")


if __name__ == "__main__":
    main()
