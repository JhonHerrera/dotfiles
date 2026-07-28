# Load the managed Powerlevel10k configuration once Oh My Zsh is ready.
typeset -g THEME_SWITCH_P10K_CONFIG="${ZDOTDIR:-$HOME}/.p10k.zsh"

if [[ -r $THEME_SWITCH_P10K_CONFIG &&
      ${POWERLEVEL9K_CONFIG_FILE:-} != "$THEME_SWITCH_P10K_CONFIG" ]]; then
  source "$THEME_SWITCH_P10K_CONFIG"
fi

# Switch the Powerlevel10k palette and Herdr theme together, then refresh the
# current prompt without requiring a new shell.
function theme-switch() {
  local switcher="$HOME/.local/bin/theme-switch"

  if [[ ! -x $switcher ]]; then
    print -u2 -r -- "theme-switch executable not found: $switcher"
    return 1
  fi

  if (( $# == 0 )) || [[ $1 == --list ]]; then
    command "$switcher" "$@"
    return
  fi

  command "$switcher" "$@" || return
  source "$THEME_SWITCH_P10K_CONFIG"
}
