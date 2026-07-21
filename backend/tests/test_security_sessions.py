from types import SimpleNamespace

from app.core import security


class FakeQuery:
    def __init__(self, database):
        self.database = database

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def upsert(self, payload, **_kwargs):
        self.database.revoked_payload = dict(payload)
        return self

    def execute(self):
        return SimpleNamespace(data=self.database.rows)


class FakeService:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.revoked_payload = None

    def table(self, table_name):
        assert table_name == "revoked_auth_sessions"
        return FakeQuery(self)


def test_revoked_session_is_rejected(monkeypatch):
    service = FakeService(rows=[{"session_id": "session-1"}])
    monkeypatch.setattr(security, "get_service", lambda: service)

    assert security.is_auth_session_revoked("session-1") is True


def test_revoke_session_persists_session_and_expiry(monkeypatch):
    service = FakeService()
    monkeypatch.setattr(security, "get_service", lambda: service)

    security.revoke_auth_session(
        {
            "id": "6c1d9268-41b9-4f41-84f1-86d0d86e9f95",
            "session_id": "14ae4fac-4608-4319-bc3e-349f0bcb27f0",
            "exp": 1784600000,
        }
    )

    assert service.revoked_payload == {
        "session_id": "14ae4fac-4608-4319-bc3e-349f0bcb27f0",
        "user_id": "6c1d9268-41b9-4f41-84f1-86d0d86e9f95",
        "expires_at": "2026-07-21T02:13:20+00:00",
    }
