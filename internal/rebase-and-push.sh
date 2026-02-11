#!/bin/bash

set -e

# Rebase all local branches to main and push
# Usage: ./rebase-and-push.sh

CURRENT_BRANCH=$(git branch --show-current)

# Get all local branches except main
mapfile -t BRANCHES < <(git branch --format='%(refname:short)' | grep -v '^main$')

if [ ${#BRANCHES[@]} -eq 0 ]; then
  echo "No branches to rebase (only main exists)"
  exit 0
fi

echo "Found ${#BRANCHES[@]} branch(es): ${BRANCHES[*]}"

echo "Fetching latest main..."
git fetch origin main

echo ""
echo "=== Rebasing branches ==="

for branch in "${BRANCHES[@]}"; do
  MERGE_BASE=$(git merge-base origin/main "$branch")
  MAIN_HEAD=$(git rev-parse origin/main)

  if [ "$MERGE_BASE" = "$MAIN_HEAD" ]; then
    echo "Skipping $branch - already rebased"
    continue
  fi

  echo "Rebasing $branch onto main..."
  git checkout "$branch"
  git rebase origin/main
  echo "✓ $branch rebased"
done

# Return to original branch
git checkout "$CURRENT_BRANCH"

echo ""
echo "=== Pushing branches ==="

for branch in "${BRANCHES[@]}"; do
  echo "Pushing $branch..."
  git push origin "$branch" --force-with-lease
  echo "✓ $branch pushed"
done

echo ""
echo "Done!"
