# Verification

## Music player — 2026-10-06

`node scripts/test-themes.cjs` still passes 16 checks.
`node scripts/test-music.cjs` passes 20 complete music flows: all five themes
at 320×640, 390×844, 844×390 and 1366×900. These checks cover lazy Spotify
loading, playback event handling, play/pause, restart, Back and returned focus,
CV navigation, refreshed playlist embeds, no horizontal overflow, full-screen
mobile layout, close/restore, maximize and the blocked-API fallback. Browser
checks use a controlled Spotify API fixture; they do not claim to verify audio
delivery by the external service. JavaScript syntax and `git diff --check` pass.

The supplied public Spotify playlist and its three example tracks were read
from Spotify's live embed. Real embed loading was also exercised, but the
automated browser encountered an upstream Spotify React hydration error and
did not reliably receive a ready/playback event. Actual listening therefore
remains governed by Spotify and the visitor's browser/session. The normal
Spotify playlist iframe and direct playlist link remain available independently
of the optional custom controls.

Spotify resources load only on entering Music. The site does not copy the
playlist contents or use a Spotify API secret. The normal playlist embed is
shown immediately while the optional iFrame control API loads; a visitor who
has already focused that embed keeps it, avoiding interruption of playback.

## Earlier theme verification

Retro OS appearances checked on 2026-10-01. The homepage still contains Nathan's
two original GitHub and LinkedIn shortcuts and the original unmodified artwork.

`node scripts/test-themes.cjs` passes 16 checks: Windows, Mac, generic Linux,
Ubuntu-labelled Linux, Android before Linux, iPhone, desktop-mode iPad, Mac
without touch, structured OS hints, Chrome OS, unknown devices, saved choices,
invalid preferences, Automatic and blocked storage.

Chromium interaction and screenshot checks pass for all five appearances at
desktop or tablet dimensions, Android and iOS at 390 × 844, and all three desktop
skins at 320 × 640. All six choices fit inside their menus. Both original PNGs
decode successfully, the links retain their correct destinations, and no page
script errors or horizontal overflow were found.

Additional browser checks pass for:

- Switching through every appearance using its visible menu control.
- Saved choices surviving reload, and Automatic clearing the saved preference.
- Desktop maximize/restore, minimize/reopen, and close/reopen through the menus.
- iOS and Android resizing between 320, 390, 768 and 1366px without losing the
  selected appearance; tablet Settings sidebars appear only on wide screens.
- Escape dismissal, returned focus, and inert backgrounds for mobile dialogs.
- Desktop-mode iPad detection, blocked local storage and reduced motion.
- A working two-link Windows fallback with JavaScript disabled.

The static, self-contained output was inspected in Chromium via a local file
because the execution environment isolates loopback networking. It contains no
external script, image, font or stylesheet dependencies. Both `index.html` and
`docs/index.html` are generated identically, supporting either GitHub Pages
source folder. The existing GitHub Pages configuration remains unchanged.
