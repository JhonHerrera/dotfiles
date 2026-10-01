# dotfiles

Personal dotfiles managed via symlinks.

## Install tmux config

```sh
./scripts/install-tmux.sh
```

## Install synchronized Herdr and Zsh themes

This setup switches the Herdr UI theme and the Powerlevel10k prompt palette
together. It manages only configuration; it does not install any tools.

Prerequisites:

- Zsh
- Oh My Zsh at `~/.oh-my-zsh` (override with `ZSH`)
- Powerlevel10k in the Oh My Zsh custom themes directory (override with
  `POWERLEVEL10K_DIR`)
- Herdr

Check a machine without changing it:

```sh
./scripts/install-shell-themes.sh --check
```

Install the managed symlinks and Zsh integration:

```sh
./scripts/install-shell-themes.sh
exec zsh
```

The installer validates every prerequisite before it writes anything. It
symlinks the managed Herdr config (`dotfiles/herdr/config.toml`), sets Oh My Zsh to
Powerlevel10k, and adds one marked integration block to `.zshrc`. Existing
managed targets and `.zshrc` are backed up with timestamps. Re-running the
installer is safe.

Catppuccin is the default on a new machine. Choose a different initial theme:

```sh
THEME_SWITCH_DEFAULT=tokyo-night ./scripts/install-shell-themes.sh
```

Available themes:

```text
classic
terminal
catppuccin
tokyo-night
dracula
nord
gruvbox
one-dark
```

List or switch themes from Zsh:

```sh
theme-switch --list
theme-switch nord
theme-switch one-dark
```

The theme state is stored at
`${XDG_CONFIG_HOME:-$HOME/.config}/zsh/theme`. The Herdr config defaults to
`${XDG_CONFIG_HOME:-$HOME/.config}/herdr/config.toml`; set
`HERDR_CONFIG_PATH` if it lives elsewhere.

## Herdr config

`dotfiles/herdr/config.toml` is linked to
`${XDG_CONFIG_HOME:-$HOME/.config}/herdr/config.toml` by the shell-theme
installer. It turns off onboarding and enables in-app toasts and sounds when
background agents finish or need attention. Run `herdr --default-config` for
every available option, then apply edits with:

```sh
herdr config check && herdr server reload-config
```

`theme-switch` edits the `[theme]` name in this file through the symlink, so
switching themes shows up as a change in this repo.
