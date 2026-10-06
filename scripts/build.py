"""Build the static HTML entrypoints. No dependencies."""
from pathlib import Path
from hashlib import sha256

root = Path(__file__).resolve().parent.parent

def build(asset_prefix=""):
    html = (root / "src/index.template.html").read_text()
    html = html.replace("@@ASSET_PREFIX@@", asset_prefix)
    for source in [root / "src/base.css", root / "src/theme-bootstrap.js", root / "src/desktop.js", root / "src/music.js", *sorted((root / "src/styles").glob("*.css"))]:
        version = sha256(source.read_bytes()).hexdigest()[:12]
        html = html.replace(f'assets/{source.name}"', f'assets/{source.name}?v={version}"')
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
    (root / "docs", build()),
]
for directory, html in outputs:
    directory.mkdir(exist_ok=True)
    assets = directory / "assets"
    assets.mkdir(exist_ok=True)
    sources = [root / "src/base.css", root / "src/theme-bootstrap.js", root / "src/desktop.js", root / "src/music.js"]
    sources.extend(sorted((root / "src/styles").glob("*.css")))
    for source in sources:
        content = source.read_text()
        if "@@" in content:
            raise ValueError(f"Unresolved template token in {source.relative_to(root)}")
        (assets / source.name).write_text(content)
    if directory != root:
        from shutil import copytree
        copytree(root / "artwork", directory / "artwork", dirs_exist_ok=True)
    (directory / "index.html").write_text(html)
    (directory / ".nojekyll").touch()
    print(f"Built {directory.relative_to(root) if directory != root else '.'}/index.html ({len(html.encode()):,} bytes)")
