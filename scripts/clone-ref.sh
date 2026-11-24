#!/usr/bin/env bash
# Recreate the reference working clone used to write ETUDE.md.
# ref/ is gitignored: this is study material, never part of the skill.
set -euo pipefail

repo="https://github.com/kaankiziltug/logo-design-skill.git"
commit="e9eaddc07895575253d6663320354a708f53e955"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="$root/ref/logo-design-skill"

if [ -d "$dest/.git" ]; then
  git -C "$dest" fetch --all --tags
else
  mkdir -p "$root/ref"
  git clone "$repo" "$dest"
fi

git -C "$dest" checkout "$commit"
printf 'reference ready at %s (%s)\n' "$dest" "$commit"
