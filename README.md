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
- `src/music.js` and `src/styles/music.css`: live Spotify playlist and five OS music player shells.
- `artwork/icons/`: separate transparent WebP icons for each appearance.
- `artwork/`: original generated PNGs and the hand-authored cursor SVG.
- `scripts/build.py`: copies assets and builds both HTML entrypoints with versioned CSS and JavaScript URLs.
- `scripts/test-themes.cjs`: OS detection and preference regression checks.
- `ICON_PROMPTS.md`: original image prompts and generation details.

## Make changes

```sh
python3 scripts/build.py
node scripts/test-themes.cjs
node scripts/test-music.cjs # optional browser checks; requires Playwright/Chromium
```

Commit the changed source files, artwork, and rebuilt `assets/`, `docs/`, and HTML files.
Pushes to `main` publish the committed website automatically. The Python build
runs locally, not on the hosting server.

## Music

The Music shortcut opens Nathan's Spotify playlist
`4J8Zno4WdUbklWUBffoirT`. Spotify supplies the current track list and playback,
so editing that playlist requires no site rebuild. `Reload playlist` refreshes
the embed during a visit. To select a different playlist, update its URL in
`src/music.js` and `src/index.template.html`, then rebuild.

Windows uses Winamp 2 styling, Classic Mac a QuickTime-era player, Ubuntu a
GNOME 2 Rhythmbox-style library, and Android/iOS their period Music styling.
The official Spotify player remains visible inside each shell. Play/pause and
restart use Spotify's iFrame API; if it is blocked, a plain Spotify embed and
direct playlist link remain available. Playback is user initiated, and may be
full tracks or previews depending on Spotify and the visitor's browser/session.
Returning home or closing the app stops playback; minimizing retains it.
The Spotify script and iframe load only when Music is first opened.

Music icon source credits and relevant licenses are in
`artwork/icons/music-sources/`.

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

## Pocket Pint

The iOS and Android appearances share a Pocket Pint app, inspired by early iPhone
beer simulators. Drag the glass or use the keyboard-accessible tilt slider to
pour. Hold the glass or Refill to fill gradually; release to stop. Beer only
leaves when the liquid reaches the downhill rim, retaining the rest at a fixed
angle. Gravity projection and smoothing keep phone tilt stable and correctly
orient the surface. Available orientation readings start automatically when
the app opens. An Allow motion button appears only on browsers with an explicit
permission API; it disappears once permission or valid readings are available.
Permission requests are triggered by that button only. Pour/fill stream drawings
are omitted; the beer level changes within the glass.
Declined permission, missing sensors and unsupported browsers retain manual
controls. Rotation is adjusted for portrait and both landscape directions, with nearly
flat devices ignored to avoid an unstable screen gravity direction.
The canvas simulation and sensor listener stop on Back, a theme change, or
when the page is backgrounded. Reduced motion removes ambient bubbles/slosh.
On phones the glass fills most of the view. Manual slider/drag rotates the
glass, scaling it to stay visible; sensor-driven tilt keeps the glass fixed to
the physical screen. A manual angle takes precedence until returned to neutral.
No sensor readings leave the browser and no third-party assets are loaded by
this app. `src/pint.js` and `src/styles/pint.css` own the simulation and UI;
`scripts/test-pint-physics.cjs` checks retained volume, rim overflow and sensor
coordinates; `scripts/test-pint.cjs` checks viewports, pouring/refill, permission paths,
simulated orientation events, lifecycle and reduced motion.


## Angry Nathan

Both mobile appearances also include Angry Nathan: drag Nathan’s photo head
back from the slingshot and release to knock down server/crate towers and
squash bugs. There are three levels and four heads per attempt. Angle/power
sliders and Fling provide an alternative; arrow keys aim and Space launches.
Retry resets the level, and Next level appears after clearing all bugs. The
iOS and Android toolbars use their respective era styling. Back/backgrounding
stops the simulation; changing the canvas dimensions resets the current puzzle.

Physics uses locally bundled Matter.js 0.20.0, under the MIT license in
`src/vendor/MATTER-LICENSE.txt` and the built assets. The game renders the existing
portrait into a head circle, without modifying or generating a replacement photo.
The artwork is drawn in canvas; no Angry Birds art or game code is included.
`src/angry.js`, `src/styles/angry.css` and `scripts/test-angry.cjs` own the game.
The two toys are offered in both mobile OS themes and hidden in desktop themes.
