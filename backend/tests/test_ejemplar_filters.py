from types import SimpleNamespace

from app.services import ejemplar_service


class FakeQuery:
    def __init__(self, database):
        self.database = database

    def select(self, *_args, **_kwargs):
        return self

    def ilike(self, field, pattern):
        self.database.ilike_filters.append((field, pattern))
        return self

    def order(self, *_args, **_kwargs):
        return self

    def range(self, *_args, **_kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=[])


class FakeSupabase:
    def __init__(self):
        self.ilike_filters = []

    def table(self, table_name):
        assert table_name == "ejemplar"
        return FakeQuery(self)


def test_nursery_and_invoice_filters_use_postgrest_safe_wildcards(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(ejemplar_service, "get_public", lambda: database)

    result = ejemplar_service.list_staff(
        nursery=" Vivero QA ",
        invoice_number=" FAC-100 ",
    )

    assert result == {"data": [], "total": 0}
    assert database.ilike_filters == [
        ("nursery", "*Vivero QA*"),
        ("invoice_number", "*FAC-100*"),
    ]
