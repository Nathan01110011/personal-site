# Retro shortcut artwork

## Current theme icons

The current UI uses 20 independent 256 × 256 lossless WebP files in
`artwork/icons/`, displayed at 80 × 80. Windows, Mac, Android, and iOS icons were
repaired with image generation using the previous artwork as references.
Prompts requested complete object borders, opaque interiors, and transparency
only outside the object. The invalid Ubuntu sprite was replaced with matching
GNOME 2 / Human-style folder, address book, notes, and settings artwork.

Exports crop each icon with padding, resize it, and preserve its alpha channel.
Do not remove background colours with a colour key: pale paper, silver borders,
and dark outlines are part of the icons. CSS uses one file per icon rather than
offsets into a sprite strip. `scripts/build.py` copies them into `docs/artwork/`.

## Original Windows artwork

Generation mode: built-in image generation (`image_gen.imagegen`). Two original
PNG assets were generated in one bounded batch, with no retries or raster edits.
The originals are copied intact into `artwork/` and embedded byte-for-byte in
`dist/index.html`. Both are 1254 × 1254 RGBA PNGs with transparent backgrounds.

- `artwork/github-win95.png`: yellow folder with an Octocat badge.
- `artwork/linkedin-win95.png`: blue address book with a white “in” monogram.

The prompt requested a logical 32 × 32 grid. The results have a retro pixel
appearance, but are not exact 32 × 32 sprites or a strict 16-colour palette.

## Shared prompt prefix

```text
Use case: stylized-concept.
Asset type: one Windows 95/98 desktop shortcut PNG icon for a portfolio website, displayed about 64 pixels wide on a teal desktop.
Style/medium: authentic tiny hand-pixelled 1990s Windows desktop icon. Design on a strict logical 32x32 pixel grid and enlarge crisply with nearest-neighbor pixels. Large hard square pixel blocks, chunky dark outlines, limited Windows 95 16-colour palette, tiny white highlights from the upper left, sparse checker-dithered shadows within the object only. Three-quarter/isometric desktop-icon perspective: broad front face toward the viewer, small right side and top edge visible. Simple bold silhouette readable at small size.
Composition/framing: exactly one complete standalone icon centered and large, occupying about 80% of the square canvas, with modest transparent padding on all sides.
Scene/backdrop: genuinely transparent alpha background; no background pixels or ground plane.
Constraints: only the requested icon; maintain square pixel edges and the low-resolution 32x32 logical grid throughout.
Avoid: gradients, anti-aliasing, blur, rounded modern vector styling, smooth 3D rendering, photorealism, extra objects, window mockups, text labels, watermarks, baked-in checkerboard backgrounds.
```

## GitHub suffix

```text
Primary request / subject: a golden yellow Windows 95 file folder with a recognizable solid charcoal/black GitHub Octocat badge on its broad front. The folder has a chunky upper-left folder tab, black pixel outline, yellow/gold front, darker olive/gold side and dithered shadow pixels. The Octocat badge is a compact readable cat-eared head and curled tentacle silhouette, high-contrast and centered on the folder front. It should feel like a retro code repository desktop shortcut.
Text: none. Do not write the word GitHub or any other text.
```

## LinkedIn suffix

```text
Primary request / subject: a blue Windows 95 address book / personal contact book in the same three-quarter perspective and logical pixel scale as a classic file-folder desktop icon. Broad saturated blue cover with dark navy/black pixel outline, a small darker blue right side, cream page edges represented by pale yellow/white pixels and restrained dither, and tiny square white highlights on the upper-left cover edge.
Text (verbatim): "in" — one clear white lowercase pixel monogram centered on the blue front cover, i then n, chunky bitmap lettering large enough to read at 64px. No other text, labels, or decoration.
```
