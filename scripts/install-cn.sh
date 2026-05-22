#!/usr/bin/env bash
# harness-manager installer for China (with built-in mirror support)
# Optimized for users in mainland China with GitHub access issues
#
# Quick install:
#   curl -fsSLk https://ghproxy.cc/https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install-cn.sh | bash
#
set -euo pipefail

# Mirror URLs (try multiple for reliability)
MIRRORS=(
  "https://ghproxy.cc/https://raw.githubusercontent.com"
  "https://ghproxy.net/https://raw.githubusercontent.com"
  "https://mirror.ghproxy.com/https://raw.githubusercontent.com"
)

GITHUB_USER="hanYuZ46"
GITHUB_REPO="harness-manage"
INSTALLER_PATH="${GITHUB_USER}/${GITHUB_REPO}/main/scripts/install-gitlab.sh"

# Try each mirror
echo "Downloading installer from mirror..."
INSTALLER_URL=""
for mirror in "${MIRRORS[@]}"; do
  if curl -fsSLk --max-time 15 "${mirror}/${INSTALLER_PATH}" -o /tmp/harness-install-tmp.sh 2>/dev/null; then
    INSTALLER_URL="${mirror}/${INSTALLER_PATH}"
    echo "Using mirror: $mirror"
    break
  fi
done

if [ -n "$INSTALLER_URL" ] && [ -f /tmp/harness-install-tmp.sh ]; then
  echo "Running installer..."
  bash /tmp/harness-install-tmp.sh
  rm -f /tmp/harness-install-tmp.sh
else
  echo "Mirror download failed, trying direct GitHub..."
  # Fallback to direct GitHub
  if curl -fsSL --max-time 30 "https://raw.githubusercontent.com/${INSTALLER_PATH}" -o /tmp/harness-install-tmp.sh 2>/dev/null; then
    echo "Running installer from GitHub..."
    bash /tmp/harness-install-tmp.sh
    rm -f /tmp/harness-install-tmp.sh
  else
    echo "Error: Cannot download installer. Check your network connection."
    echo "Manual installation:"
    echo "  1. Visit: https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases"
    echo "  2. Download latest harness-cli for your platform"
    echo "  3. Extract to ~/.local/bin/harness"
    exit 1
  fi
fi
