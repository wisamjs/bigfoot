"""Who is calling, decided without a database or HTTP: the token checks in app/auth.py, given a stand-in
request and, for an Access token, a stand-in pool that answers the lookup. test_access_tokens.py checks
the lookup against Postgres: expiry, revocation and when last_used_at moves."""

import hashlib
import time
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import jwt
import pytest
from argon2 import PasswordHasher
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import (
    ACCESS_TOKEN_PATTERN,
    ACCESS_TOKEN_PREFIX,
    AUDIENCE,
    ISSUER,
    SHARE_LINK_ID_PATTERN,
    access_token_hash,
    job_seeker_id,
    new_access_token,
    new_share_link_id,
    new_viewer_token,
    passcode_hash,
    passcode_matches,
    signed_in_job_seeker_id,
    viewer,
)

SECRET = "unit-test-secret-of-at-least-32-bytes"
ACCESS_TOKEN = ACCESS_TOKEN_PREFIX + "a" * 43


class Pool:
    """Answers the Access token lookup with `row`, and remembers what it was asked."""

    def __init__(self, row: dict[str, Any] | None):
        self.row = row
        self.params: list[tuple] = []

    def connection(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def execute(self, _query: str, params: tuple):
        self.params.append(params)
        return SimpleNamespace(fetchone=lambda: self.row)


def request(pool: Pool | None = None) -> Any:
    state = SimpleNamespace(settings=SimpleNamespace(api_secret=SECRET), pool=pool or Pool(None))
    return SimpleNamespace(app=SimpleNamespace(state=state))


def bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def web_token(secret: str = SECRET, drop: tuple[str, ...] = (), **claims: Any) -> str:
    claims = {"sub": "alice", "aud": AUDIENCE, "iss": ISSUER, "exp": int(time.time()) + 60} | claims
    return jwt.encode({k: v for k, v in claims.items() if k not in drop}, secret, algorithm="HS256")


def refused(call, status: int = 401) -> str:
    with pytest.raises(HTTPException) as caught:
        call()
    assert caught.value.status_code == status
    return caught.value.detail


# Web tokens


def test_a_valid_web_token_names_its_job_seeker():
    assert job_seeker_id(request(), None, bearer(web_token())) == "alice"
    assert signed_in_job_seeker_id(request(), bearer(web_token(sub="bob"))) == "bob"


@pytest.mark.parametrize("credentials", [None, bearer("")], ids=["no header", "empty"])
def test_a_missing_token_is_refused(credentials):
    assert refused(lambda: job_seeker_id(request(), None, credentials)) == "Missing bearer token"
    assert refused(lambda: signed_in_job_seeker_id(request(), credentials)) == "Missing bearer token"


@pytest.mark.parametrize(
    "token",
    [
        web_token(exp=int(time.time()) - 1),
        web_token(aud="someone-else"),
        web_token(iss="someone-else"),
        web_token(secret="a-different-secret-of-32-bytes-or-more"),
        web_token(drop=("exp",)),
        web_token(drop=("sub",)),
        jwt.encode({"sub": "alice", "aud": AUDIENCE, "iss": ISSUER, "exp": int(time.time()) + 60}, SECRET, "HS384"),
        "not-a-jwt",
    ],
    ids=["expired", "wrong audience", "wrong issuer", "wrong secret", "no expiry", "no subject", "HS384", "garbage"],
)
def test_a_bad_web_token_is_refused(token):
    assert refused(lambda: job_seeker_id(request(), None, bearer(token))) == "Invalid token"
    assert refused(lambda: signed_in_job_seeker_id(request(), bearer(token))) == "Invalid token"


def test_a_web_token_tags_errors_with_the_hashed_job_seeker(monkeypatch):
    tagged = []
    monkeypatch.setattr("app.auth.tag_job_seeker", tagged.append)
    job_seeker_id(request(), None, bearer(web_token()))
    assert tagged == ["alice"]


# Access tokens


def test_a_known_access_token_names_its_job_seeker_and_is_looked_up_by_its_hash(monkeypatch):
    tagged = []
    monkeypatch.setattr("app.auth.tag_job_seeker", tagged.append)
    pool = Pool({"job_seeker_id": "alice"})
    assert job_seeker_id(request(pool), bearer(ACCESS_TOKEN), None) == "alice"
    assert pool.params == [(access_token_hash(ACCESS_TOKEN),)]
    assert tagged == ["alice"]


def test_an_unknown_expired_or_revoked_access_token_is_refused():
    # The lookup finds no row for any of them.
    assert refused(lambda: job_seeker_id(request(Pool(None)), bearer(ACCESS_TOKEN), None)) == "Invalid token"


@pytest.mark.parametrize(
    "token",
    [ACCESS_TOKEN_PREFIX, ACCESS_TOKEN_PREFIX + "a" * 42, ACCESS_TOKEN + "a", ACCESS_TOKEN_PREFIX + "a" * 42 + "!"],
    ids=["prefix only", "too short", "too long", "not base64url"],
)
def test_a_malformed_access_token_is_refused_before_any_lookup(token):
    pool = Pool({"job_seeker_id": "alice"})
    assert refused(lambda: job_seeker_id(request(pool), bearer(token), None)) == "Invalid token"
    assert pool.params == []


def test_an_access_token_cannot_use_the_account_routes():
    pool = Pool({"job_seeker_id": "alice"})
    detail = refused(lambda: signed_in_job_seeker_id(request(pool), bearer(ACCESS_TOKEN)), status=403)
    assert detail.startswith("An Access token can't use Account routes.")
    assert pool.params == []


def test_new_access_tokens_match_the_pattern_and_never_repeat():
    tokens = {new_access_token() for _ in range(100)}
    assert len(tokens) == 100
    assert all(ACCESS_TOKEN_PATTERN.fullmatch(token) for token in tokens)


def test_an_access_token_is_stored_as_its_sha256_hex_digest():
    assert access_token_hash(ACCESS_TOKEN) == hashlib.sha256(ACCESS_TOKEN.encode()).hexdigest()
    assert access_token_hash(ACCESS_TOKEN) != access_token_hash(ACCESS_TOKEN + "x")


def test_new_share_link_ids_are_10_url_safe_characters_and_never_repeat():
    ids = {new_share_link_id() for _ in range(200)}
    assert len(ids) == 200
    assert all(SHARE_LINK_ID_PATTERN.fullmatch(link_id) for link_id in ids)


def test_a_passcode_is_stored_as_a_salted_argon2id_hash():
    first, second = passcode_hash("maple-river-42"), passcode_hash("maple-river-42")
    assert first.startswith("$argon2id$")
    assert "maple-river-42" not in first
    assert first != second  # each hash has its own salt
    assert PasswordHasher().verify(first, "maple-river-42")


def test_a_passcode_matches_only_its_own_hash():
    stored = passcode_hash("maple-river-42")
    assert passcode_matches(stored, "maple-river-42")
    assert not passcode_matches(stored, "maple-river-43")
    assert not passcode_matches("not-a-hash", "maple-river-42")


# Viewer tokens (docs/adr/0008)

IN_A_WEEK = datetime.now(UTC) + timedelta(days=7)


def test_a_viewer_token_names_its_share_link_and_passcode_version():
    token = new_viewer_token(SECRET, "k7Qm2x9PaB", 3, IN_A_WEEK)
    found = viewer(request(), bearer(token))
    assert (found.share_link_id, found.passcode_version) == ("k7Qm2x9PaB", 3)
    assert jwt.decode(token, options={"verify_signature": False})["exp"] == int(IN_A_WEEK.timestamp())


def test_a_viewer_token_is_refused_once_its_link_has_expired():
    token = new_viewer_token(SECRET, "k7Qm2x9PaB", 1, datetime.now(UTC) - timedelta(seconds=1))
    assert refused(lambda: viewer(request(), bearer(token))) == "Invalid token"


def test_a_viewer_token_signed_with_another_secret_is_refused():
    token = new_viewer_token("another-secret-of-at-least-32-bytes!", "k7Qm2x9PaB", 1, IN_A_WEEK)
    assert refused(lambda: viewer(request(), bearer(token))) == "Invalid token"


@pytest.mark.parametrize(
    "token",
    [web_token(), ACCESS_TOKEN, ""],
    ids=["web token", "Access token", "none"],
)
def test_a_web_token_or_access_token_is_not_a_viewer_token(token):
    pool = Pool({"job_seeker_id": "alice"})
    refused(lambda: viewer(request(pool), bearer(token) if token else None))
    assert pool.params == []


def test_a_viewer_token_is_not_a_web_token():
    token = new_viewer_token(SECRET, "k7Qm2x9PaB", 1, IN_A_WEEK)
    assert refused(lambda: job_seeker_id(request(), None, bearer(token))) == "Invalid token"
    assert refused(lambda: signed_in_job_seeker_id(request(), bearer(token))) == "Invalid token"


@pytest.mark.parametrize("claims", [{"ver": "1"}, {"sub": 7}], ids=["version not a number", "link not a string"])
def test_a_viewer_token_with_malformed_claims_is_refused(claims):
    payload = {"sub": "k7Qm2x9PaB", "ver": 1, "aud": "bigfoot-viewer", "iss": "bigfoot-api"} | claims
    token = jwt.encode(payload | {"exp": int(IN_A_WEEK.timestamp())}, SECRET, algorithm="HS256")
    refused(lambda: viewer(request(), bearer(token)))
