# Nathan — personal site

My personal homepage, with two profile shortcuts and five retro OS appearances:
Windows 98, Classic Mac (Platinum), Ubuntu (GNOME 2), Android, and iOS 6.

The first visit selects an appearance from the browser's reported OS. All
desktop Linux distributions use Ubuntu. Android is checked before Linux, and
desktop-mode iPads are distinguished from Macs. Unknown devices use Windows.
A manual choice is saved locally; **Automatic** clears it and follows the OS.

Switch appearances from **Start** on Windows, the **Mac / Appearance** menu on
Mac, **System** on Ubuntu, or the **Settings** app on Android and iOS.
Every appearance remains selectable on every device. Android and iOS use phone
layouts on narrow screens and tablet layouts from 768px: Honeycomb-style Android
chrome or an iPad-style app grid and two-pane Settings. No extra profile
content has been added. Desktop window controls, a pixel cursor and optional
pointer trails are retained; trails respect reduced motion and are disabled in
the mobile OS appearances.

Repository: https://github.com/Nathan01110011/personal-site

Website: https://nathan01110011.github.io/personal-site/

GitHub: https://github.com/Nathan01110011

LinkedIn: https://www.linkedin.com/in/nathan-scott-orr

## Site files

`index.html` loads the local CSS, JavaScript, and artwork files. No build service
or application server is required. `docs/` contains the same website so either
GitHub Pages source folder works.

- `src/index.template.html`: editable page, styling, and behavior.
- `src/base.css` and `src/styles/`: the five appearances and responsive layouts.
- `src/theme-bootstrap.js`: OS detection and the saved preference, before paint.
- `src/desktop.js`: menu, window, clock, theme switching and pointer behavior.
- `artwork/icons/`: separate transparent WebP icons for each appearance.
- `artwork/`: original generated PNGs and the hand-authored cursor SVG.
- `scripts/build.py`: copies assets and builds both HTML entrypoints with versioned CSS and JavaScript URLs.
- `scripts/test-themes.cjs`: OS detection and preference regression checks.
- `ICON_PROMPTS.md`: original image prompts and generation details.

## Make changes

```sh
python3 scripts/build.py
node scripts/test-themes.cjs
```

Commit the changed source files, artwork, and rebuilt `assets/`, `docs/`, and HTML files.
Pushes to `main` publish the committed website automatically. The Python build
runs locally, not on the hosting server.

## GitHub Pages setup

GitHub Pages is enabled. In Settings → Pages, use **Deploy from a branch**,
**main**, and **/(root)**. Publishing from **/docs** is also supported.
Both source folders contain `.nojekyll` to serve the output as plain HTML.

To connect a custom domain later, first add it under Settings → Pages, then
configure the corresponding DNS records at Namecheap. GitHub provisions the
HTTPS certificate; enable Enforce HTTPS when available. The domain can stay
registered with Namecheap. The repository's `CNAME` now configures `nathan.wtf`.

GitHub Pages documentation:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Namecheap shared hosting

Upload `index.html`, `assets/`, and `artwork/` together into
the domain's document root on shared / cPanel hosting.
