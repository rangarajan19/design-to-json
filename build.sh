#!/bin/bash
# Design to JSON — build script
# Run after completing a meaningful set of changes.
# Bumps patch version in manifest.json, updates README.md.

set -e
PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$PLUGIN_DIR/manifest.json"
README="$PLUGIN_DIR/README.md"
DATE=$(date "+%Y-%m-%d")

NEW_VERSION=$(python3 << PYEOF
import json, re

with open("$MANIFEST") as f:
    m = json.load(f)

parts = m.get("version", "1.0.0").split(".")
parts[2] = str(int(parts[2]) + 1)
new_version = ".".join(parts)
m["version"] = new_version

with open("$MANIFEST", "w") as f:
    json.dump(m, f, indent=2)
    f.write("\n")

# Update README version line
version_line = "**Version:** " + new_version + " — $DATE"
with open("$README") as f:
    content = f.read()

if re.search(r"^\*\*Version:\*\*", content, re.MULTILINE):
    content = re.sub(r"^\*\*Version:\*\*.*$", version_line, content, flags=re.MULTILINE)
else:
    content = content.replace(
        "# Design to JSON — Figma Plugin\n",
        "# Design to JSON — Figma Plugin\n\n" + version_line + "\n"
    )

with open("$README", "w") as f:
    f.write(content)

print(new_version)
PYEOF
)

echo "Design to JSON v$NEW_VERSION — $DATE"
