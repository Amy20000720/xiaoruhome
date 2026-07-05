#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
remote="${GIT_REMOTE:-origin}"
branch="${PAGES_BRANCH:-gh-pages}"
dist_dir="${DIST_DIR:-dist}"
short_sha="$(git -C "$repo_root" rev-parse --short HEAD)"
deploy_dir="$(mktemp -d "${TMPDIR:-/tmp/}xiaoruhome-${branch}.XXXXXX")"

cleanup() {
  git -C "$repo_root" worktree remove "$deploy_dir" --force >/dev/null 2>&1 || true
  rm -rf "$deploy_dir" >/dev/null 2>&1 || true
}

trap cleanup EXIT

if [[ ! -d "$repo_root/$dist_dir" ]]; then
  echo "Missing $dist_dir. Run npm run build first."
  exit 1
fi

git -C "$repo_root" fetch "$remote" "$branch"
git -C "$repo_root" worktree add --detach "$deploy_dir" "$remote/$branch"

rsync -a --delete --exclude=".git" "$repo_root/$dist_dir"/ "$deploy_dir"/
git -C "$deploy_dir" add -A

if git -C "$deploy_dir" diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi

git -C "$deploy_dir" commit -m "Deploy site from $short_sha"
git -C "$deploy_dir" push "$remote" "HEAD:$branch"
echo "Deployed $dist_dir to $branch from $short_sha."
