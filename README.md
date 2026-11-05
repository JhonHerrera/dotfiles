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

## Pi user-message design

The `prompt-blue` theme and rounded user-message outline are saved in
`dotfiles/pi/`. Messages have a rounded border, light text, and no background
fill. At widths below three columns, the border is omitted so text still fits.

This setup requires Node.js 22.19+ and an npm installation of
`@earendil-works/pi-coding-agent` on Linux, macOS, or WSL. It was tested with
Pi 1.5.0. Check what would change without writing any files:

```sh
node scripts/install-pi-design.mjs --check
```

Install or restore the design, then check the actual installed renderer:

```sh
node scripts/install-pi-design.mjs
node scripts/check-pi-design.mjs
```

Restart Pi after installing. Use `pi -c` in your working directory to continue
the previous session.

The installer copies the theme, selects `prompt-blue`, and patches Pi's
installed user-message renderer. Other settings stay unchanged. Every changed
existing file gets a timestamped `.before-outline-...` backup beside it.
Running the installer again leaves identical files alone. Credentials, session
history, and machine-specific settings are not stored in this repository.

Pi updates can replace the renderer. Run the installer again after updating.
The patch locates bundle files by their contents instead of keeping filenames
that change with each release. It refuses unfamiliar renderer code before
writing anything. If an update changes that code, review
`dotfiles/pi/outline-patch.mjs` before adapting it. The theme alone cannot add
the rounded outline.

By default, the installer finds Pi on `PATH` and uses `~/.pi/agent`, or
`PI_CODING_AGENT_DIR` when set. Both scripts accept `--pi-root PATH` to select
an installation. The installer also accepts `--agent-dir PATH` for a different
configuration directory.

Run the focused patch and installer tests:

```sh
node --test tests/pi-design.test.mjs
```
