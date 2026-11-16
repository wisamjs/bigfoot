"""Vercel entrypoint: Vercel needs a top-level `app`. Kept out of app/main.py so importing that
module (tests, tooling) doesn't read the environment."""

from app.main import create_app

app = create_app()
