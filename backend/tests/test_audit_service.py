from types import SimpleNamespace

from app.services import audit_service


class FakeQuery:
    def __init__(self, database):
        self.database = database
        self.operation = None
        self.payload = None
        self.is_count = False

    def select(self, *_args, **kwargs):
        self.operation = "select"
        self.is_count = kwargs.get("count") == "exact"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = dict(payload)
        return self

    def eq(self, *_args):
        return self

    def limit(self, *_args):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def range(self, *_args):
        return self

    def execute(self):
        if self.operation == "insert":
            self.database.inserted = dict(self.payload)
            return SimpleNamespace(data=[{"id": 100, **self.payload}])
        if self.is_count:
            return SimpleNamespace(data=[{"id": 1}], count=37)
        return SimpleNamespace(data=[{"id": 37, "accion": "PURCHASE"}])


class FakeSupabase:
    def __init__(self):
        self.inserted = None

    def table(self, table_name):
        assert table_name == "auditoria_cambios"
        return FakeQuery(self)


def test_log_change_preserves_purchase_action(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(audit_service, "get_service", lambda: database)

    audit_service.log_change("ejemplar", 12, "PURCHASE", user_id=2)

    assert database.inserted["accion"] == "PURCHASE"


def test_log_change_rejects_unknown_action_without_fallback(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(audit_service, "get_service", lambda: database)

    audit_service.log_change("ejemplar", 12, "UNKNOWN", user_id=2)

    assert database.inserted is None


def test_get_audit_log_returns_page_and_filtered_total(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(audit_service, "get_service", lambda: database)

    logs, total = audit_service.get_audit_log(limit=1)

    assert len(logs) == 1
    assert total == 37
