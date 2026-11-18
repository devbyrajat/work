"""Same-origin local preview for the built Vite site and public API."""

from pathlib import Path

from starlette.staticfiles import StaticFiles

from .main import create_app


dist = Path(__file__).resolve().parents[2] / "dist"
if not (dist / "index.html").is_file():
    raise RuntimeError("Build the frontend with npm run build before starting the preview.")

app = create_app()
app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
