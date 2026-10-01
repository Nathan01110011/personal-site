# Verification

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
