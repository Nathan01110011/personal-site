"""Embed unmodified artwork into a single static HTML file. No dependencies."""
from pathlib import Path
from base64 import b64encode
from urllib.parse import quote

root = Path(__file__).resolve().parent.parent
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
    payload = b64encode((root / "artwork" / filename).read_bytes()).decode("ascii")
    html = html.replace(token, f"data:image/png;base64,{payload}")
cursor = (root / "artwork/cursor.svg").read_text().strip()
html = html.replace("@@CURSOR_URL@@", "data:image/svg+xml," + quote(cursor, safe=""))
if "@@" in html:
    raise ValueError("Unresolved template token")
for directory in (root, root / "docs"):
    directory.mkdir(exist_ok=True)
    (directory / "index.html").write_text(html)
    (directory / ".nojekyll").touch()
print(f"Built index.html and docs/index.html ({len(html.encode()):,} bytes each)")
