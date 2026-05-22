#!/usr/bin/env bash
# harness-manager installer for China (with built-in mirror support)
# Optimized for users in mainland China with GitHub access issues
#
# Quick install:
#   curl -fsSLk https://ghproxy.cc/https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install-cn.sh | bash
#
set -euo pipefail

# Set mirror by default (for users without ability to set env vars)
export GITHUB_MIRROR_URL="${GITHUB_MIRROR_URL:-https://ghproxy.cc/https://github.com}"
INSTALLER_URL="${GITHUB_RAW_MIRROR_URL:-https://ghproxy.cc/https://raw.githubusercontent.com}/hanYuZ46/harness-manage/main/scripts/install-gitlab.sh"

# Download and execute the main installer from mirror
echo "Downloading installer from mirror..."
if curl -fsSLk --max-time 30 "$INSTALLER_URL" -o /tmp/harness-install-tmp.sh; then
  echo "Running installer..."
  bash /tmp/harness-install-tmp.sh
  rm -f /tmp/harness-install-tmp.sh
else
  echo "Failed to download installer, trying fallback..."
  # Fallback: build from source
  echo "Building from source..."
  tmp_dir=$(mktemp -d)
  if git clone --depth 1 https://github.com/hanYuZ46/harness-manage.git "$tmp_dir/src" 2>/dev/null; then
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
  else
    echo "Error: Cannot clone repository. Check your network connection."
    rm -rf "$tmp_dir"
    exit 1
  fi
fi
