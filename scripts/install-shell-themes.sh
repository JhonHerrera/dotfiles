#!/usr/bin/env sh
set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_ROOT="$REPO_ROOT/dotfiles"
CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}"
ZSH_CONFIG_ROOT="${ZDOTDIR:-$HOME}"
ZSHRC="$ZSH_CONFIG_ROOT/.zshrc"
OH_MY_ZSH_DIR="${ZSH:-$HOME/.oh-my-zsh}"
ZSH_CUSTOM_DIR="${ZSH_CUSTOM:-$OH_MY_ZSH_DIR/custom}"
POWERLEVEL10K_DIR="${POWERLEVEL10K_DIR:-$ZSH_CUSTOM_DIR/themes/powerlevel10k}"
HERDR_CONFIG_PATH="${HERDR_CONFIG_PATH:-$CONFIG_ROOT/herdr/config.toml}"
DEFAULT_THEME="${THEME_SWITCH_DEFAULT:-catppuccin}"
CHECK_ONLY=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-shell-themes.sh [--check]

Checks for zsh, Oh My Zsh, Powerlevel10k, and Herdr before changing anything.
With --check, performs only the prerequisite checks.

Environment overrides:
  THEME_SWITCH_DEFAULT  Initial theme on a new setup (default: catppuccin)
  ZSH                   Oh My Zsh directory
  ZSH_CUSTOM            Oh My Zsh custom directory
  POWERLEVEL10K_DIR     Powerlevel10k directory
  XDG_CONFIG_HOME       Configuration root
  HERDR_CONFIG_PATH     Herdr config path
EOF
}

case "${1:-}" in
  "")
    ;;
  --check)
    CHECK_ONLY=true
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

failures=0

require_command() {
  if command -v "$1" >/dev/null 2>&1; then
    printf '  ok  %s: %s\n' "$1" "$(command -v "$1")"
  else
    printf '  missing  %s\n' "$1" >&2
    failures=$((failures + 1))
  fi
}

require_file() {
  label=$1
  path=$2
  if [ -r "$path" ]; then
    printf '  ok  %s: %s\n' "$label" "$path"
  else
    printf '  missing  %s: %s\n' "$label" "$path" >&2
    failures=$((failures + 1))
  fi
}

printf 'Checking shell-theme prerequisites...\n'
require_command zsh
require_command herdr
require_command awk
require_file "Oh My Zsh" "$OH_MY_ZSH_DIR/oh-my-zsh.sh"
require_file "Powerlevel10k" "$POWERLEVEL10K_DIR/powerlevel10k.zsh-theme"

if [ -r "$HERDR_CONFIG_PATH" ]; then
  if HERDR_CONFIG_PATH="$HERDR_CONFIG_PATH" herdr config check >/dev/null 2>&1; then
    printf '  ok  Herdr config: %s\n' "$HERDR_CONFIG_PATH"
  else
    printf '  invalid  Herdr config: %s\n' "$HERDR_CONFIG_PATH" >&2
    failures=$((failures + 1))
  fi
else
  printf '  new  Herdr config will be created: %s\n' "$HERDR_CONFIG_PATH"
fi

if [ -r "$ZSHRC" ]; then
  if grep -Eq '^[[:space:]]*(source|\.)[[:space:]]+.*oh-my-zsh\.sh' "$ZSHRC"; then
    printf '  ok  Zsh config: %s\n' "$ZSHRC"
  else
    printf '  invalid  %s does not load Oh My Zsh\n' "$ZSHRC" >&2
    failures=$((failures + 1))
  fi
else
  printf '  new  Zsh config will be created: %s\n' "$ZSHRC"
fi

if [ "$failures" -ne 0 ]; then
  printf '\nNothing changed. Install or repair the missing prerequisites, then retry.\n' >&2
  exit 1
fi

if [ "$CHECK_ONLY" = true ]; then
  printf '\nAll prerequisites are ready. Nothing changed.\n'
  exit 0
fi

timestamp=$(date +%Y%m%d-%H%M%S)

backup_existing() {
  destination=$1
  if [ -e "$destination" ] || [ -L "$destination" ]; then
    backup="${destination}.backup.${timestamp}"
    suffix=0
    while [ -e "$backup" ] || [ -L "$backup" ]; do
      suffix=$((suffix + 1))
      backup="${destination}.backup.${timestamp}.${suffix}"
    done
    mv -- "$destination" "$backup"
    printf '  backup  %s\n' "$backup"
  fi
}

backup_copy() {
  source_file=$1
  backup="${source_file}.backup.${timestamp}"
  suffix=0
  while [ -e "$backup" ] || [ -L "$backup" ]; do
    suffix=$((suffix + 1))
    backup="${source_file}.backup.${timestamp}.${suffix}"
  done
  cp -p -- "$source_file" "$backup"
  printf '  backup  %s\n' "$backup"
}

link_managed_file() {
  source_file=$1
  destination=$2

  if [ -L "$destination" ] &&
     [ "$(readlink "$destination")" = "$source_file" ]; then
    printf '  keep  %s\n' "$destination"
    return
  fi

  mkdir -p -- "$(dirname -- "$destination")"
  backup_existing "$destination"
  ln -s -- "$source_file" "$destination"
  printf '  link  %s -> %s\n' "$destination" "$source_file"
}

mkdir -p -- "$CONFIG_ROOT/zsh/themes" "$HOME/.local/bin" "$(dirname -- "$HERDR_CONFIG_PATH")"

link_managed_file "$SOURCE_ROOT/zsh/.p10k.zsh" "$ZSH_CONFIG_ROOT/.p10k.zsh"
link_managed_file "$SOURCE_ROOT/zsh/theme-switch.zsh" "$CONFIG_ROOT/zsh/theme-switch.zsh"
link_managed_file "$SOURCE_ROOT/bin/theme-switch" "$HOME/.local/bin/theme-switch"

for source_file in "$SOURCE_ROOT"/zsh/themes/*.p10k.zsh; do
  link_managed_file "$source_file" "$CONFIG_ROOT/zsh/themes/$(basename -- "$source_file")"
done

if [ ! -e "$HERDR_CONFIG_PATH" ]; then
  {
    printf '# Created by the dotfiles shell-theme installer.\n'
    printf '[theme]\n'
    printf 'name = "terminal"\n'
  } >"$HERDR_CONFIG_PATH"
  printf '  create  %s\n' "$HERDR_CONFIG_PATH"
fi

zshrc_was_new=false
if [ ! -e "$ZSHRC" ]; then
  zshrc_was_new=true
  mkdir -p -- "$(dirname -- "$ZSHRC")"
  {
    printf 'export ZSH="$HOME/.oh-my-zsh"\n'
    printf 'ZSH_THEME="powerlevel10k/powerlevel10k"\n'
    printf 'source "$ZSH/oh-my-zsh.sh"\n'
  } >"$ZSHRC"
  printf '  create  %s\n' "$ZSHRC"
fi

zshrc_tmp=$(mktemp "${ZSHRC}.tmp.XXXXXX")
trap 'rm -f -- "$zshrc_tmp"' EXIT HUP INT TERM

awk '
  function flush_blanks(  i) {
    for (i = 0; i < pending_blanks; i++)
      print ""
    pending_blanks = 0
  }
  BEGIN {
    theme_written = 0
    pending_blanks = 0
    in_managed_block = 0
  }
  /^# >>> dotfiles shell themes >>>$/ {
    in_managed_block = 1
    pending_blanks = 0
    next
  }
  /^# <<< dotfiles shell themes <<</ {
    in_managed_block = 0
    next
  }
  in_managed_block { next }
  /^[[:space:]]*$/ {
    pending_blanks++
    next
  }
  /^[[:space:]]*(export[[:space:]]+)?ZSH_THEME[[:space:]]*=/ {
    next
  }
  /^[[:space:]]*(source|\.)[[:space:]]+.*oh-my-zsh\.sh/ && !theme_written {
    flush_blanks()
    print "ZSH_THEME=\"powerlevel10k/powerlevel10k\""
    theme_written = 1
  }
  {
    flush_blanks()
    print
  }
  END {
    if (!theme_written)
      exit 42
  }
' "$ZSHRC" >"$zshrc_tmp" || {
  printf 'Could not place ZSH_THEME before Oh My Zsh in %s\n' "$ZSHRC" >&2
  exit 1
}

{
  printf '\n# >>> dotfiles shell themes >>>\n'
  printf '[[ -r "${XDG_CONFIG_HOME:-$HOME/.config}/zsh/theme-switch.zsh" ]] && source "${XDG_CONFIG_HOME:-$HOME/.config}/zsh/theme-switch.zsh"\n'
  printf '# <<< dotfiles shell themes <<<\n'
} >>"$zshrc_tmp"

if cmp -s -- "$ZSHRC" "$zshrc_tmp"; then
  rm -f -- "$zshrc_tmp"
  printf '  keep  %s\n' "$ZSHRC"
else
  if [ "$zshrc_was_new" = false ]; then
    backup_copy "$ZSHRC"
  fi
  mv -- "$zshrc_tmp" "$ZSHRC"
  printf '  update  %s\n' "$ZSHRC"
fi
trap - EXIT HUP INT TERM

if [ -r "$CONFIG_ROOT/zsh/theme" ] && [ -z "${THEME_SWITCH_DEFAULT+x}" ]; then
  IFS= read -r DEFAULT_THEME <"$CONFIG_ROOT/zsh/theme"
fi

HERDR_CONFIG_PATH="$HERDR_CONFIG_PATH" "$HOME/.local/bin/theme-switch" "$DEFAULT_THEME"

printf '\nShell themes installed. Start a new Zsh shell or run: exec zsh\n'
printf 'Then use: theme-switch --list\n'
