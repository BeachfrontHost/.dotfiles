#!/usr/bin/env bash
# ========================================================
# install.sh – Install Homebrew, Starship, Stow, dotfiles,
#                thefuck, and Atuin.
# ========================================================
#
# Usage:
#   curl -fsSL -o bootstrap.sh https://<URL>/bootstrap.sh
#   chmod +x bootstrap.sh
#   ./bootstrap.sh
#
# Replace <URL> with the raw link to this file if you host it
# elsewhere.  The script is safe‑to‑run because of `set -euo pipefail`
# which aborts on any error.

set -euo pipefail
IFS=$'\n\t'

# ──────────────────────────────────────────────────────
DOTFILE_REPO="https://github.com/BeachfrontHost/.dotfiles.git"
DOTFILE_DIR="$HOME/.dotfiles"

# ──────────────────────────────────────────────────────
# Helper: Yes/No prompt
ask_yes_no() {
  local prompt="$1"
  read -rp "$prompt [y/N]: " answer
  case "$answer" in
  [yY][eE][sS] | [yY]) return 0 ;;
  *) return 1 ;;
  esac
}

# ──────────────────────────────────────────────────────
# 1. Ensure Homebrew is present
install_homebrew() {
  if command -v brew &>/dev/null; then
    echo "✅ Homebrew already installed."
    return
  fi

  echo "🚀 Installing Homebrew…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo "✅ Homebrew installation finished."

  # Add Homebrew to PATH for the remainder of the script
  eval "$(/opt/homebrew/bin/brew shellenv)" || eval "$(/usr/local/bin/brew shellenv)"
}

# ──────────────────────────────────────────────────────
# 2. Install Starship prompt
install_starship() {
  if brew list starship &>/dev/null; then
    echo "✅ Starship already installed."
    return
  fi
  echo "🚀 Installing Starship…"
  brew install starship
  echo "✅ Starship installation finished."
}

#2.a install other brew packages
brew install fzf
brew install dust
brew install eza
brew install zoxide
brew install lazygit

# ──────────────────────────────────────────────────────
# 3. Install GNU Stow
install_stow() {
  if command -v stow &>/dev/null; then
    echo "✅ GNU Stow already available."
    return
  fi
  echo "🚀 Installing GNU Stow…"
  brew install stow
  echo "✅ GNU Stow installation finished."
}

# ──────────────────────────────────────────────────────
# 4. Clone or update the dotfiles repository
clone_or_update_dotfiles() {
  if [ -d "$DOTFILE_DIR/.git" ]; then
    echo "🔄 Updating existing dotfiles repository in $DOTFILE_DIR"
    pushd "$DOTFILE_DIR" >/dev/null
    git pull --rebase
    popd >/dev/null
  else
    echo "📦 Cloning dotfiles repo into $DOTFILE_DIR"
    git clone "$DOTFILE_REPO" "$DOTFILE_DIR"
  fi
}

# ──────────────────────────────────────────────────────
# 5. Run Stow on the dotfiles
run_stow() {
  echo "⚙️  Running 'stow -v .' from $DOTFILE_DIR"
  pushd "$DOTFILE_DIR" >/dev/null
  stow -v .
  popd >/dev/null
}

# ──────────────────────────────────────────────────────
# 6. Install thefuck via pip (user‑local)
install_thefuck() {
  # Ensure we have python3 / pip3
  if ! command -v python3 &>/dev/null; then
    echo "⚠️  python3 not found; installing via Homebrew."
    brew install python@3
  fi

  if ! command -v pip3 &>/dev/null; then
    echo "⚠️  pip3 not found; re‑installing python3 to add it."
    brew install python@3
  fi

  echo "🚀 Installing thefuck ..."
  pip3 install --user thefuck

  local pip_bin="$HOME/.local/bin"
  if [[ ":$PATH:" != *":$pip_bin:"* ]]; then
    echo "⚙️  Adding $pip_bin to your PATH."
    echo "export PATH=\"$pip_bin:\$PATH\"" >>"$HOME/.bashrc" 2>/dev/null || true
    echo "export PATH=\"$pip_bin:\$PATH\"" >>"$HOME/.zshrc" 2>/dev/null || true
  fi
  echo "✅ thefuck installation finished."
}

# ──────────────────────────────────────────────────────
# 7. Install Atuin
install_atuin() {
  if command -v atuin &>/dev/null; then
    echo "✅ Atuin already installed."
    return
  fi

  # The official installer accepts a *shell* argument, we’ll pass it empty
  # and let it auto‑detect.  We run it with `--yes` to skip interactive prompts.
  echo "🚀 Installing Atuin…"
  sh -c "$(curl --proto '=https' --tlsv1.2 -LsSf https://setup.atuin.sh)" -y
  echo "✅ Atuin installation finished."

  # Tell the user to add the init line to their shell config
  echo
  echo "=== Atuin integration ==="
  echo "Add the following line to your shell configuration (~/.bashrc or ~/.zshrc):"
  echo "eval \"\$(atuin init \<your-shell\>)\""
  echo "Replace \<your-shell\> with ‘bash’, ‘zsh’, etc., depending on your shell."
  echo
}

# ──────────────────────────────────────────────────────
# Main driver
main() {
  echo "=== Starting Homebrew / Starship / Dotfiles bootstrap ==="
  install_homebrew
  install_starship
  install_stow
  clone_or_update_dotfiles
  run_stow
  install_thefuck
  install_atuin
  echo "🎉 Bootstrap finished!  Your terminal has Starship, thefuck, and Atuin."
  echo "⚡️ Restart your terminal session or run 'source ~/.bashrc' (or ~/.zshrc) to pick up the new prompts."
}

# ──────────────────────────────────────────────────────
main
