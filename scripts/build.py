"""Build the static HTML entrypoints. No dependencies."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent

def build(asset_prefix=""):
    html = (root / "src/index.template.html").read_text()
    for token, filename in [
        ("@@THEME_BOOTSTRAP@@", "theme-bootstrap.js"),
        ("@@THEME_STYLES@@", "themes.css"),
        ("@@DESKTOP_SCRIPT@@", "desktop.js"),
    ]:
        html = html.replace(token, (root / "src" / filename).read_text())
    for token, filename in [
        ("@@GITHUB_ICON@@", "github-win95.png"),
        ("@@LINKEDIN_ICON@@", "linkedin-win95.png"),
    ]:
        html = html.replace(token, f"{asset_prefix}artwork/{filename}")
    html = html.replace("@@CURSOR_URL@@", f"{asset_prefix}artwork/cursor.svg")
    if "@@" in html:
        raise ValueError("Unresolved template token")
    return html

outputs = [
    (root, build()),
    (root / "docs", build("../")),
]
for directory, html in outputs:
    directory.mkdir(exist_ok=True)
    (directory / "index.html").write_text(html)
    (directory / ".nojekyll").touch()
    print(f"Built {directory.relative_to(root) if directory != root else '.'}/index.html ({len(html.encode()):,} bytes)")
