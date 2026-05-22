#!/usr/bin/env bash
# harness-manager installer
# Supports both GitLab (internal) and GitHub (public) installation
#
# Install from GitHub (no login required):
#   curl -fsSL https://raw.githubusercontent.com/hanYuZ46/harness-manage/main/scripts/install.sh | bash
#
# Install from GitLab (requires token for company instance):
#   curl -fsSL "https://gitlab.enncloud.cn/moss/harness/harness-cli/-/raw/main/scripts/install-gitlab.sh?private_token=YOUR_TOKEN" | bash
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# Try GitLab first, fallback to GitHub
GITLAB_URL="https://gitlab.enncloud.cn"
GITLAB_PROJECT="moss/harness/harness-cli"
GITLAB_API="${GITLAB_URL}/api/v4/projects/${GITLAB_PROJECT//\//%2F}"

GITHUB_USER="hanYuZ46"
GITHUB_REPO="harness-manage"
GITHUB_RAW="https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main"

INSTALL_DIR="${HARNESS_MANAGER_INSTALL_DIR:-$HOME/.harness-manager/server}"

# Colors
if [ -t 1 ] || [ -t 2 ]; then
  BOLD='\033[1m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  CYAN='\033[0;36m'
  RESET='\033[0m'
else
  BOLD='' GREEN='' YELLOW='' RED='' CYAN='' RESET=''
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { printf "${BOLD}${CYAN}==> %s${RESET}\n" "$*"; }
ok()    { printf "${BOLD}${GREEN}✓ %s${RESET}\n" "$*"; }
warn()  { printf "${BOLD}${YELLOW}⚠ %s${RESET}\n" "$*" >&2; }
fail()  { printf "${BOLD}${RED}✗ %s${RESET}\n" "$*" >&2; exit 1; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="darwin" ;;
    Linux)  OS="linux" ;;
    *)      fail "Unsupported operating system: $(uname -s)" ;;
  esac

  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)       fail "Unsupported architecture: $ARCH" ;;
  esac
}

# ---------------------------------------------------------------------------
# Get latest version from GitLab or GitHub
# ---------------------------------------------------------------------------
get_latest_version() {
  # Try GitLab API first
  local latest
  latest=$(curl -sf "${GITLAB_API}/repository/tags" 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"//;s/"//')

  if [ -n "$latest" ]; then
    echo "$latest"
    return
  fi

  # Fallback to GitHub API (different JSON format)
  latest=$(curl -sf "https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/tags" 2>/dev/null | grep -o '"name": *"[^"]*"' | head -1 | sed 's/"name": *"//;s/"//')

  if [ -n "$latest" ]; then
    echo "$latest"
    return
  fi

  # Last fallback: try GitHub releases API
  latest=$(curl -sf "https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest" 2>/dev/null | grep -o '"tag_name": *"[^"]*"' | sed 's/"tag_name": *"//;s/"//')
  echo "$latest"
}

# ---------------------------------------------------------------------------
# Install CLI
# ---------------------------------------------------------------------------
install_cli() {
  info "Installing harness CLI..."

  local latest
  latest=$(get_latest_version)
  if [ -z "$latest" ]; then
    warn "Could not determine latest release, using main branch"
    latest="main"
  fi

  local version="${latest#v}"
  local url=""
  local source_name=""

  # Try GitHub Releases first (public, no login required)
  url="https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/${latest}/harness-cli-${version}-${OS}-${ARCH}.tar.gz"
  source_name="GitHub Releases"

  # Fallback to GitLab Releases (for internal users with token)
  if ! curl -sfI "$url" >/dev/null 2>&1; then
    info "GitHub release not found, trying GitLab..."
    url="${GITLAB_URL}/${GITLAB_PROJECT}/-/releases/${latest}/downloads/harness-cli-${version}-${OS}-${ARCH}.tar.gz"
    source_name="GitLab Releases"
  fi

  # Fallback to GitLab CI artifacts
  if ! curl -sfI "$url" >/dev/null 2>&1; then
    info "GitLab release not found, trying CI artifacts..."
    url="${GITLAB_URL}/${GITLAB_PROJECT}/-/jobs/artifacts/${latest}/raw/dist/harness-cli-${version}-${OS}-${ARCH}.tar.gz?job=build"
    source_name="GitLab CI"
  fi

  local tmp_dir
  tmp_dir=$(mktemp -d)

  info "Downloading from ${source_name}..."
  if ! curl -fsSL "$url" -o "$tmp_dir/harness.tar.gz" 2>/dev/null; then
    rm -rf "$tmp_dir"
    # Fallback: build from source (try GitHub as it's public)
    info "Downloading source, building locally..."
    git clone --depth 1 "https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git" "$tmp_dir/src" 2>/dev/null
    cd "$tmp_dir/src"
    GOOS=$OS GOARCH=$ARCH go build -ldflags="-s -w" -o "$tmp_dir/harness" ./server/cmd/harness
  else
    tar -xzf "$tmp_dir/harness.tar.gz" -C "$tmp_dir"
    local binary_name
    binary_name=$(ls "$tmp_dir" | grep -E '^harness' | head -1)
    mv "$tmp_dir/$binary_name" "$tmp_dir/harness"
  fi

  # Install to user directory (no sudo required)
  local bin_dir="$HOME/.local/bin"
  mkdir -p "$bin_dir"
  mv "$tmp_dir/harness" "$bin_dir/harness"
  chmod +x "$bin_dir/harness"
  rm -rf "$tmp_dir"

  # Add to PATH if not already there
  if ! echo "$PATH" | tr ':' '\n' | grep -q "^$bin_dir$"; then
    export PATH="$bin_dir:$PATH"
    # Add to shell rc
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
      if [ -f "$rc" ] && ! grep -qF "$bin_dir" "$rc"; then
        printf '\n# Added by harness installer\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc"
      fi
    done
  fi

  ok "harness CLI installed to $bin_dir/harness"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  printf "\n"
  printf "${BOLD}  harness-manager — Installer${RESET}\n"
  printf "\n"

  detect_os
  install_cli

  printf "\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "${BOLD}${GREEN}  ✓ harness CLI is ready!${RESET}\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "\n"
  printf "  ${BOLD}Next: configure your environment${RESET}\n"
  printf "\n"
  printf "     ${CYAN}harness config set server_url${RESET}  <your-server-url>\n"
  printf "     ${CYAN}harness login${RESET}                  # Authenticate\n"
  printf "     ${CYAN}harness daemon start${RESET}           # Start daemon\n"
  printf "\n"
}

main "$@"
