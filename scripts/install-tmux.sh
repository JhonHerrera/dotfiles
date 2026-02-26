#!/usr/bin/env sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/dotfiles/tmux/.tmux.conf"
DEST="$HOME/.tmux.conf"

ln -sf "$SRC" "$DEST"
echo "Linked $SRC -> $DEST"
