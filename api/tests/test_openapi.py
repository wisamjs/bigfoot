"""The OpenAPI schema documents every route, and /docs is served only when API_DOCS is on."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import get_settings

DOC_PATHS = ("/docs", "/redoc", "/openapi.json")


def operations(schema):
    for path, methods in schema["paths"].items():
        for method, operation in methods.items():
            yield f"{method.upper()} {path}", operation


@pytest.fixture(scope="module")
def schema():
    return create_app(replace(get_settings(), api_docs=False)).openapi()


def test_every_operation_has_a_summary_description_and_tag(schema):
    for name, operation in operations(schema):
        assert operation.get("summary"), name
        assert operation.get("description"), name
        assert operation.get("tags") in (["Account"], ["Applications"], ["Interviews"], ["Health"]), name


def test_every_operation_but_health_needs_a_token_and_documents_401(schema):
    for name, operation in operations(schema):
        if name == "GET /health":
            assert "security" not in operation
            continue
        assert operation["security"] == [{"BearerToken": []}], name
        assert "401" in operation["responses"], name


def test_routes_with_an_id_document_404(schema):
    for name, operation in operations(schema):
        if "{application_id}" in name:
            assert "404" in operation["responses"], name


def test_bodies_document_every_field(schema):
    models = schema["components"]["schemas"]
    documented = ("ApplicationCreate", "ApplicationPatch", "Application", "InterviewCreate", "InterviewPatch")
    for model in (*documented, "Interview"):
        for field, spec in models[model]["properties"].items():
            if field not in ("id", "created_at", "updated_at"):
                assert spec.get("description"), f"{model}.{field}"


def test_bearer_scheme_drives_the_authorize_dialog(schema):
    scheme = schema["components"]["securitySchemes"]["BearerToken"]
    assert scheme["type"] == "http"
    assert scheme["scheme"] == "bearer"


@pytest.mark.parametrize("enabled", [False, True])
def test_docs_are_served_only_when_enabled(settings, enabled):
    with TestClient(create_app(replace(settings, api_docs=enabled))) as client:
        for path in DOC_PATHS:
            assert client.get(path).status_code == (200 if enabled else 404), path


def test_a_token_from_the_authorize_dialog_works(settings, token):
    # Swagger UI sends `Authorization: Bearer <token>`, as the token fixture does.
    with TestClient(create_app(replace(settings, api_docs=True))) as client:
        assert client.get("/applications", headers=token()).status_code == 200
        assert client.get("/applications", headers={"Authorization": "Basic abc"}).status_code == 401


@pytest.mark.parametrize(("value", "enabled"), [(None, False), ("", False), ("false", False), ("true", True)])
def test_api_docs_setting(monkeypatch, value, enabled):
    if value is None:
        monkeypatch.delenv("API_DOCS", raising=False)
    else:
        monkeypatch.setenv("API_DOCS", value)
    assert get_settings().api_docs is enabled
