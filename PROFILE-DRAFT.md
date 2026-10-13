# Profile draft

Branch: `feat/profile-card`. Profile is the first launcher app in every OS theme.
The branch starts from the latest main, including the larger Spotify player.

Content is kept in `src/profile-content.json`: name, role, company,
location, origin, bio, work focus, interests and portrait path. The bio, work focus and interests use the wording Nathan reviewed on 13 October.
Sports has an indented list: Manchester United, Ulster and New York Giants.

Sections: About, Work, Interests. Links use their existing launcher apps. Desktop themes use a separate window;
Android and iOS use their full-screen Contacts layout.

Portrait styles use the same original photo:

- Windows: a 64×80 pixel bitmap using Windows high-colour (RGB565) tones.
- Classic Mac: a 96×120 grayscale bitmap with eight grey tones and subtle ordered dithering.
- Ubuntu: a regular photograph with slightly muted colors.
- Android / iOS: the unchanged photograph.

The permanent portrait is `artwork/portraits/nathan.jpg`, provided by Nathan.
The original pixels are retained. The normal portrait is shown on Android/iOS;
Windows and Mac generate the low-resolution variant at display time. The review
page can temporarily override it with a local photo without uploading that file.

Run `python3 scripts/build.py` after changing content. The two generated static
entrypoints and their assets are committed together. Profile checks:
`TEST_BROWSER_PATH=/path/to/chromium node scripts/test-profile.cjs`.
