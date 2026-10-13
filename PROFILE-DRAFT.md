# Profile draft

Branch: `feat/profile-card`. Profile is the first launcher app in every OS theme.
The branch starts from the latest main, including the larger Spotify player.

Content is kept in `src/profile-content.json`: name, initials, role, company,
location, origin, bio, work focus, interests and portrait path. The short bio,
work focus and interests are placeholders for Nathan to replace. No drafted
biographical paragraphs or guessed hobbies are included.

Sections: About, Work, Interests, Links. Desktop themes use a separate window;
Android and iOS use their full-screen Contacts layout.

Portrait styles use the same original photo:

- Windows: a 32×40 pixel bitmap, reduced to the classic 16-color palette.
- Classic Mac: a 64×80 black-and-white ordered-dither bitmap.
- Ubuntu: a regular photograph with slightly muted colors.
- Android / iOS: the unchanged photograph.

The portrait is currently unset; initials are shown. In the interactive review
file, Choose photo reads a local file in the browser and applies each style.
The photo is never uploaded or written to the repository. A permanent portrait
can be supplied later via the `portrait` field and a local artwork file.

Run `python3 scripts/build.py` after changing content. The two generated static
entrypoints and their assets are committed together. Profile checks:
`TEST_BROWSER_PATH=/path/to/chromium node scripts/test-profile.cjs`.
