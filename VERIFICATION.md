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

The deployed site was verified in the live Chrome browser at `https://nathan.wtf/`.
The playlist displayed all three example tracks. Starting playback through the
custom Play button produced Spotify playback events, the “Playing from Spotify”
status, an advancing timer observed at 00:21, and the animated player display.
Pause and playlist reload were also exercised. This browser received Spotify
previews; full-track availability remains determined by Spotify and the visitor's
browser/session. Windows and Classic Mac shells were inspected with the live
Spotify player. A Winamp verification screenshot is saved in `verification/`.

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

## Independent app windows and Settings repair — 6 October 2026

CV Notes and Music now use separate persistent windows on Windows, Classic Mac
and Ubuntu. Each has its own drag, minimize, maximize/restore and close controls;
launching an existing app restores it without creating another Spotify player.
The root launcher stays available. Opening CV or minimizing Music preserves
playback; closing Music unloads its iframe. Mobile themes retain full-screen apps.
The tablet iOS Settings sidebar stretches to the bottom, with a scrollable choice
pane on short screens. Playback has one combined Play/Pause control.

Validation: 16 OS/preference checks and 20 controlled Spotify browser flows
covering all five themes at 320×640, 390×844, 844×390 and 1366×900. Additional
checks cover simultaneous app windows, dragging, minimize/reopen, maximize,
closing the launcher while Music plays, one iframe on repeated launch, desktop/
mobile theme transitions, tablet Settings at 960×1400 and 844×390, and blocked
Spotify API fallback. No page script errors or horizontal overflow were found.
The controlled API verifies UI behavior; actual Spotify audio is checked separately
on the published site.

Live verification after deployment: the official Spotify embed played a preview
inside the independent Winamp window (observed 00:17). Opening and focusing CV
left playback active. Both app windows and the launcher were moved independently.
The custom playback group exposed one Pause control. Live screenshot:
`verification/desktop-app-windows-1791318542004.jpg`.

## Maximize geometry and restore icon repair — 6 October 2026

Maximizing an app now removes its inline drag coordinates so the desktop insets
position every edge. Normal theme width limits no longer constrain maximized
windows. Restoring reapplies the saved app position. The control switches between
a single-window maximize symbol and overlapping-window restore symbol.

The existing 20 music/theme/viewport flows pass. New regression checks verify
all four actual window bounds, restored position and dimensions, and both icon
states for the launcher, CV and Music on Windows, Mac and Ubuntu at 1366×900 and
390×844 (18 maximize/restore flows). JavaScript syntax and diff checks pass.

Live Winamp bounds verified after deployment: left/top 8px, right 1355px and
bottom 886px on a 1363×936 viewport. Restore returned to left 521.5px, top 42px
and width 540px. The overlapping-window icon was visible only when maximized.
Screenshot: `verification/maximize-restore-1791319230697.jpg`.

## Preserve window stacking order — 6 October 2026

Focusing a desktop window now moves only that window to the front of a persistent
stack. Other windows retain their relative order, including the launcher between
the selected app and the other app. Repeated pointer/focus events are idempotent.

The browser suite passes all existing 20 theme/viewport flows and geometry/icon
checks. New checks cover all six stacking permutations on Windows, Mac and Ubuntu,
108 selections through taskbar or Mac menu controls, repeated selection of the
front window, and direct clicks on exposed app title bars. The untouched windows
retain their order in every case. Syntax and diff checks also pass.

Live Windows check: starting with Music < CV < Home, clicking the exposed CV
title bar produced Music < Home < CV. DOM hit testing confirmed CV covers Home
and Home still covers Music. Screenshot: `verification/window-order-1791319985241.jpg`.
