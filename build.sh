#!/bin/bash
# Design to JSON — build script
# Run after completing a meaningful set of changes.
# Bumps patch version in .version file, updates README.md.

set -e
PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION_FILE="$PLUGIN_DIR/.version"
README="$PLUGIN_DIR/README.md"
DATE=$(date "+%Y-%m-%d")

NEW_VERSION=$(python3 << PYEOF
import re

version_file = "$VERSION_FILE"
readme_file = "$README"
date_str = "$DATE"

# Read or initialise version
try:
    with open(version_file) as f:
        current = f.read().strip()
except FileNotFoundError:
    current = "1.0.2"

parts = current.split(".")
parts[2] = str(int(parts[2]) + 1)
new_version = ".".join(parts)

# Write new version
with open(version_file, "w") as f:
    f.write(new_version + "\n")

# Update README version line
version_line = "**Version:** " + new_version + " — " + date_str
with open(readme_file) as f:
    content = f.read()

if re.search(r"^\*\*Version:\*\*", content, re.MULTILINE):
    content = re.sub(r"^\*\*Version:\*\*.*$", version_line, content, flags=re.MULTILINE)
else:
    content = content.replace(
        "# Design to JSON — Figma Plugin\n",
        "# Design to JSON — Figma Plugin\n\n" + version_line + "\n"
    )

with open(readme_file, "w") as f:
    f.write(content)

print(new_version)
PYEOF
)

echo "Design to JSON v$NEW_VERSION — $DATE"
