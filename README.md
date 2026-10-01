# Nathan — personal site

Version 1 of my personal homepage: a Windows 95/98 window, two retro profile
shortcuts, a pixel cursor, and optional pointer trails. Icons stack on mobile
and sit side by side on desktop. The white panel expands with the window.

Repository: https://github.com/Nathan01110011/personal-site

GitHub: https://github.com/Nathan01110011

LinkedIn: https://www.linkedin.com/in/nathan-scott-orr

## Site files

`docs/index.html` is the complete, self-contained website. Its CSS, JavaScript,
and artwork are embedded. No external dependencies or server are required.

- `src/index.template.html`: editable page, styling, and behavior.
- `artwork/`: original generated PNGs and the hand-authored cursor SVG.
- `scripts/build.py`: embeds artwork into the final HTML without changing pixels.
- `ICON_PROMPTS.md`: original image prompts and generation details.

## Make changes

```sh
python3 scripts/build.py
```

Commit both the changed source files and the rebuilt `docs/index.html`.
Once GitHub Pages is enabled, pushes to `main` publish the committed `docs/`
folder automatically. The Python build runs locally, not on the hosting server.

## GitHub Pages setup

In Settings → Pages, choose **Deploy from a branch**, select **main** and
**/docs**, and save. The `.nojekyll` file keeps the output as plain HTML.

After successful publication, the default URL will be:
https://nathan01110011.github.io/personal-site/

To connect a custom domain later, first add it under Settings → Pages, then
configure the corresponding DNS records at Namecheap. GitHub provisions the
HTTPS certificate; enable Enforce HTTPS when available. The domain can stay
registered with Namecheap. No custom domain is configured in this project yet.

GitHub Pages documentation:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Namecheap shared hosting

The same `docs/index.html` can also be uploaded directly as `index.html` into
the domain's document root on shared / cPanel hosting.
