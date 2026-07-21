from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response
from starlette.requests import Request

from app.api import routes_auth
from app.core import security
from app.middleware import auth_middleware, rate_limiter


def make_request(path="/", method="GET"):
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
        }
    )


def test_public_path_matching_does_not_expose_debug_or_similar_names():
    assert auth_middleware._is_public_path("/species/public", "GET") is True
    assert auth_middleware._is_public_path("/species/public/slug", "GET") is True
    assert auth_middleware._is_public_path("/debug/environment", "GET") is False
    assert auth_middleware._is_public_path("/species/notpublic/data", "GET") is False
    assert auth_middleware._is_public_path("/other/public", "GET") is False


def test_auth_bypass_is_ignored_in_production(monkeypatch):
    monkeypatch.setenv("BYPASS_AUTH", "true")
    monkeypatch.setattr(auth_middleware, "IS_PRODUCTION", True)
    assert auth_middleware._is_bypass_enabled() is False

    monkeypatch.setattr(auth_middleware, "IS_PRODUCTION", False)
    assert auth_middleware._is_bypass_enabled() is True


def test_auth_rate_limits_are_isolated_by_scope():
    rate_limiter._rate_limit_store.clear()
    request = make_request("/auth/request-otp", "POST")

    assert rate_limiter.check_rate_limit(request, 1, 60, scope="request-otp")[0] is True
    assert rate_limiter.check_rate_limit(request, 1, 60, scope="request-otp")[0] is False
    assert rate_limiter.check_rate_limit(request, 1, 60, scope="verify-otp")[0] is True


def test_production_session_cookies_are_secure(monkeypatch):
    monkeypatch.setattr(security, "IS_PRODUCTION", True)
    response = Response()
    session = SimpleNamespace(access_token="access", refresh_token="refresh")

    security.set_supabase_session_cookies(response, session)

    cookies = response.headers.getlist("set-cookie")
    assert len(cookies) == 2
    assert all("HttpOnly" in cookie for cookie in cookies)
    assert all("SameSite=none" in cookie for cookie in cookies)
    assert all("Secure" in cookie for cookie in cookies)


def test_refresh_rejects_inactive_user_before_setting_cookies(monkeypatch):
    response = Response()
    session = SimpleNamespace(access_token="new-access", refresh_token="new-refresh")
    public_client = SimpleNamespace(
        auth=SimpleNamespace(
            refresh_session=lambda _token: SimpleNamespace(session=session)
        )
    )

    monkeypatch.setattr(routes_auth, "get_refresh_token_from_request", lambda _request: "refresh")
    monkeypatch.setattr(routes_auth, "get_public", lambda: public_client)
    monkeypatch.setattr(
        routes_auth,
        "validate_supabase_jwt",
        lambda _token: {"id": "user-1"},
    )
    monkeypatch.setattr(routes_auth, "validate_user_active", lambda _user_id: False)

    with pytest.raises(HTTPException) as exc_info:
        routes_auth.refresh_token(response, make_request("/auth/refresh", "POST"))

    assert exc_info.value.status_code == 403
    assert response.headers.getlist("set-cookie") == []


def test_logout_clears_cookies_even_when_revocation_fails(monkeypatch):
    response = Response()
    admin = SimpleNamespace(sign_out=lambda *_args, **_kwargs: None)
    service = SimpleNamespace(auth=SimpleNamespace(admin=admin))

    monkeypatch.setattr(routes_auth, "get_token_from_request", lambda _request: "access")
    monkeypatch.setattr(
        routes_auth,
        "validate_supabase_jwt",
        lambda _token: {"id": "user-1", "session_id": "session-1", "exp": 1784600000},
    )
    monkeypatch.setattr(
        routes_auth,
        "revoke_auth_session",
        lambda _claims: (_ for _ in ()).throw(RuntimeError("database unavailable")),
    )
    monkeypatch.setattr(routes_auth, "get_service", lambda: service)

    routes_auth.logout(response, make_request("/auth/logout", "POST"))

    cookies = response.headers.getlist("set-cookie")
    assert len(cookies) == 2
    assert all("Max-Age=0" in cookie for cookie in cookies)
