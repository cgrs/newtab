# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

A minimal browser new tab page, packaged as a Chrome MV3 extension (`manifest.json` overrides `newtab` with `index.html`). Plain HTML, CSS and an ES module: no build step, no package manager, no tests.

## Commands

Tasks live in `mise.toml` (`mise tasks` lists them):

- `mise run lint`: Biome lint over JS, CSS, HTML and JSON. The formatter is disabled on purpose to keep the hand-aligned code; `biome.json` excludes the vendored `lit-html.js` and turns off three a11y rules that don't apply (no forms, intentional autofocus, toggle labels that wrap their checkbox).
- `mise run dev`: `caddy run` in the foreground, serving the repo at `https://newtab.localhost`. `./start.sh` does the same in the background, logging to `caddy.log`.
- `mise run docker:build` / `mise run docker:run`: build the `caddy:2-alpine` image and serve it on `http://localhost:8080`. The `Dockerfile` lists files explicitly, so add any new asset there.
- `mise run package`: zip the extension files into `dist/newtab.zip`. This list is explicit too.

CI (`.github/workflows/ci.yml`) runs lint, plus a docker build with a curl smoke test.

## Running it

- As an extension: load the repo directory unpacked from `chrome://extensions`. This is the only mode where top sites and the `!` history filter work, since they need `chrome.topSites` and `chrome.history`.
- As a plain page (Caddy or Docker), the `chrome.*` features silently no-op.

## Architecture

Everything lives in `script.js`, split into sections by `// ── Name ──` banner comments: stores, helpers, render functions, components, then init and event wiring.

- **Rendering**: `lit-html.js` is a vendored jsDelivr bundle of `lit-html@3.3.3`, imported directly. Only `html` and `render` are used; there is no LitElement. Components are hand-rolled custom elements (`bookmark-grid`, `bookmark-category`, `top-sites-grid`) that call `render(html\`...\`, this)` into light DOM from property setters, so `style.css` styles them globally.
- **State**: all persistence is `localStorage`, one key per concern: `newtab_bm_v1` (bookmarks), `newtab_settings`, `newtab_name`, `newtab_accent`. Bookmarks are `[{id, name, links: [{name, url}]}]`, and the `bm*` functions mutate that array in place by index (`ci` category, `li` link).
- **Bookmark updates**: `bookmark-category` gets the whole `bm` array plus its own index. Typing in an edit field saves and re-renders only that category; structural changes dispatch a bubbling `bm-changed` event, and `bookmark-grid` re-renders by assigning a fresh array copy (`this.bm = [...this._bm]`) to trigger its setter.
- **Edit mode**: the edit toggle adds `body.editing`. CSS uses that class to swap links for inputs and show drag handles, delete buttons and the settings panel. Drag-and-drop only starts when the drag began on a `.drag-handle` (module-level `dragFromHandle` flag) and edit mode is on; module-level `drag` holds `{type: 'cat'|'link', ci, li}`.
- **Settings**: applied as CSS custom properties on `:root` (`--bm-cols`, `--page-width`, `--accent`). Accent presets are in `PRESETS`; light and dark defaults come from `prefers-color-scheme` in `style.css`.
- **Search**: suggestions come from `google.com/complete/search?client=firefox` (hence `host_permissions` in the manifest), debounced 220 ms. Input starting with `!` skips suggestions and filters `top-sites-grid` against `chrome.history` instead; Enter then opens the first match. `/` focuses the search box from anywhere.
- **Import/export**: Netscape bookmark HTML. `parseNetscapeBookmarks` handles the HTML5 parser nesting the `<DL>` inside the `<DT>`, and falls back to a single "imported" category of every `http(s)` link.

## Conventions

- UI copy is lowercase throughout ("search...", "+ category", "reset to default"). Keep it that way.
- `wishlist.md` holds planned features (clock, pinned links, `/` hint, Todoist panel).
- `.agents/skills/chrome-extension-development` is a vendored skill tracked by `skills-lock.json`.
