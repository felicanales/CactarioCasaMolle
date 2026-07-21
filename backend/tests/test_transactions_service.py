from types import SimpleNamespace

from app.services import transactions_service


class FakeQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.operation = None
        self.payload = None
        self.filters = []

    def select(self, *_args, **_kwargs):
        self.operation = "select"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = dict(payload)
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def limit(self, _value):
        return self

    def execute(self):
        if self.table_name == "usuarios":
            return SimpleNamespace(data=[{"id": 42}])
        if self.table_name == "facturas_compra" and self.operation == "insert":
            self.database.inserted_purchase = dict(self.payload)
            return SimpleNamespace(data=[{"id": 7, **self.payload}])
        raise AssertionError(f"Consulta inesperada: {self.table_name} {self.operation}")


class FakeSupabase:
    def __init__(self):
        self.inserted_purchase = None

    def table(self, table_name):
        return FakeQuery(self, table_name)


def test_create_purchase_resolves_auth_uuid_to_internal_user_id(monkeypatch):
    fake_supabase = FakeSupabase()
    monkeypatch.setattr(transactions_service, "get_service", lambda: fake_supabase)
    monkeypatch.setattr(transactions_service.audit_service, "get_service", lambda: fake_supabase)
    monkeypatch.setattr(transactions_service.audit_service, "log_change", lambda **_kwargs: None)

    created = transactions_service.create_purchase(
        {
            "nursery": "Vivero QA",
            "invoice_number": "QA-001",
            "issue_date": "2026-07-21",
            "net_amount": 1000,
            "tax_amount": 190,
            "total_amount": 1190,
        },
        user_id="6c1d9268-41b9-4f41-84f1-86d0d86e9f95",
        user_email="qa@example.com",
    )

    assert created["id"] == 7
    assert fake_supabase.inserted_purchase["created_by"] == 42


class FakeSalesQuery:
    def __init__(self):
        self.selected_columns = ""

    def select(self, columns, **_kwargs):
        self.selected_columns = columns
        return self

    def filter(self, *_args):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def range(self, *_args):
        return self

    def execute(self):
        assert "invoice_number" in self.selected_columns
        return SimpleNamespace(data=[{
            "id": 8,
            "species_id": None,
            "sector_id": None,
            "sale_date": "2026-07-21",
            "sale_price": 1500,
            "invoice_number": "FAC-VENTA-8",
        }])


class FakeSalesSupabase:
    def __init__(self):
        self.query = FakeSalesQuery()

    def table(self, table_name):
        assert table_name == "ejemplar"
        return self.query


def test_get_sales_grouped_includes_invoice_number(monkeypatch):
    database = FakeSalesSupabase()
    monkeypatch.setattr(transactions_service, "get_service", lambda: database)

    sales = transactions_service.get_sales_grouped()

    assert sales[0]["items"][0]["invoice_number"] == "FAC-VENTA-8"
