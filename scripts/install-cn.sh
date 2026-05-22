#!/usr/bin/env bash
# harness-manager installer for China (with built-in mirror support)
# Optimized for users in mainland China with GitHub access issues
#
# Quick install:
#   curl -fsSLk https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install-cn.sh | bash
#
set -euo pipefail

# Set mirror by default (for users without ability to set env vars)
export GITHUB_MIRROR_URL="${GITHUB_MIRROR_URL:-https://ghproxy.cc/https://github.com}"

# Download and execute the main installer from mirror
echo "Downloading installer from mirror..."
if curl -fsSLk --max-time 30 "${GITHUB_MIRROR_URL}/hanYuZ46/harness-manage/raw/main/scripts/install-gitlab.sh" -o /tmp/harness-install-tmp.sh; then
  echo "Running installer..."
  bash /tmp/harness-install-tmp.sh
  rm -f /tmp/harness-install-tmp.sh
else
  echo "Failed to download from mirror, trying fallback..."
  # Fallback: build from source
  echo "Building from source..."
  tmp_dir=$(mktemp -d)
  git clone --depth 1 https://github.com/hanYuZ46/harness-manage.git "$tmp_dir/src" 2>/dev/null || {
    echo "Error: Cannot clone repository. Check your network connection."
    rm -rf "$tmp_dir"
    exit 1
  }
  cd "$tmp_dir/src/server"
  echo "Building..."
  go build -ldflags="-s -w" -o /tmp/harness ./cmd/harness
  mkdir -p "$HOME/.local/bin"
  mv /tmp/harness "$HOME/.local/bin/harness"
  chmod +x "$HOME/.local/bin/harness"
  rm -rf "$tmp_dir"
  echo ""
  echo "✓ harness CLI installed to $HOME/.local/bin/harness"
  echo ""
  echo "Next steps:"
  echo "  harness config set server_url  <your-server-url>"
  echo "  harness login                  # Authenticate"
  echo "  harness daemon start           # Start daemon"
fi
