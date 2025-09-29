#!/usr/bin/env bash
set -euo pipefail

msg="${1:-PennyCoach: updates}"
branch="$(git rev-parse --abbrev-ref HEAD)"

echo "📦 Staging changes…"
git add -A

if git diff --cached --quiet; then
  echo "ℹ️ Nothing to commit."
else
  echo "💾 Committing: $msg"
  git commit -m "$msg"
fi

echo "⬆️  Pushing to origin/$branch…"
git push -u origin "$branch"
echo "✅ Done."
