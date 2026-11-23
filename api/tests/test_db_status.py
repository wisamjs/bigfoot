"""The `bigfoot-api` Vercel build applies migrations to prod before deploying, and fails when it
can't (BIG-71). scripts/db-status.py --deploy is that build step."""

import importlib.util
import tomllib
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "db-status.py"

spec = importlib.util.spec_from_file_location("db_status", SCRIPT)
assert spec and spec.loader
db_status = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db_status)

PROD_URL = "postgresql://postgres.ref:secret@pooler.example:5432/postgres"


@pytest.fixture(autouse=True)
def fresh_schema() -> None:
    """These tests never touch the database, so skip conftest's schema rebuild."""


def test_a_production_build_applies_to_the_migrations_database():
    assert db_status.deploy_target({"VERCEL_ENV": "production", "MIGRATIONS_DATABASE_URL": PROD_URL}) == PROD_URL


@pytest.mark.parametrize("url", [None, "", "  "])
def test_a_production_build_without_a_migrations_database_fails(url):
    env = {"VERCEL_ENV": "production"} | ({} if url is None else {"MIGRATIONS_DATABASE_URL": url})
    with pytest.raises(SystemExit, match="MIGRATIONS_DATABASE_URL is not set"):
        db_status.deploy_target(env)


def test_a_preview_build_applies_only_when_given_a_database():
    assert db_status.deploy_target({"VERCEL_ENV": "preview", "MIGRATIONS_DATABASE_URL": PROD_URL}) == PROD_URL
    assert db_status.deploy_target({"VERCEL_ENV": "preview"}) is None


@pytest.mark.parametrize("env", [{}, {"VERCEL_ENV": "development"}, {"MIGRATIONS_DATABASE_URL": PROD_URL}])
def test_a_build_off_vercel_applies_nothing(env):
    assert db_status.deploy_target(env) is None


def test_deploy_mode_connects_to_nothing_off_vercel(monkeypatch, capsys):
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.delenv("MIGRATIONS_DATABASE_URL", raising=False)
    monkeypatch.setattr(db_status, "run", lambda *_: pytest.fail("must not connect"))
    db_status.main(["--deploy"])
    assert "No migrations applied" in capsys.readouterr().out


def test_the_vercel_build_runs_the_deploy_step():
    build = tomllib.loads((ROOT / "api" / "pyproject.toml").read_text())["tool"]["vercel"]["scripts"]["build"]
    assert build == "python ../scripts/db-status.py --deploy"
    assert (ROOT / "api" / build.split()[1]).resolve() == SCRIPT


def test_migration_names_drop_the_timestamp():
    assert db_status.name("20261111180000_rename_owner_id") == "rename_owner_id"
