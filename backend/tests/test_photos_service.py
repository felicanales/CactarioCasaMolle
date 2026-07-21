from types import SimpleNamespace

from app.services import photos_service


class FakeQuery:
    def __init__(self, database):
        self.database = database
        self.operation = None

    def select(self, *_args, **_kwargs):
        self.operation = "select"
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self.operation == "select":
            return SimpleNamespace(data=[self.database.photo])
        if self.operation == "delete":
            self.database.deleted = True
            return SimpleNamespace(data=[])
        raise AssertionError(f"Operación inesperada: {self.operation}")


class FakeSupabase:
    def __init__(self, photo):
        self.photo = photo
        self.deleted = False

    def table(self, table_name):
        assert table_name == "fotos"
        return FakeQuery(self)


def test_derive_variant_paths_from_original_key():
    assert photos_service._derive_variant_paths(
        "original/ejemplares/88/photo-id.png"
    ) == {
        "w=400": "w=400/ejemplares/88/photo-id.jpg",
        "w=800": "w=800/ejemplares/88/photo-id.jpg",
    }


def test_delete_photo_removes_derived_variants_when_metadata_is_missing(monkeypatch):
    database = FakeSupabase(
        {
            "id": 91,
            "storage_path": "original/ejemplares/88/photo-id.png",
        }
    )
    deleted_objects = []
    monkeypatch.setattr(photos_service, "get_service", lambda: database)
    monkeypatch.setattr(
        photos_service.storage_router,
        "delete_object",
        lambda object_path: deleted_objects.append(object_path),
    )

    photos_service.delete_photo(91)

    assert database.deleted is True
    assert deleted_objects == [
        "original/ejemplares/88/photo-id.png",
        "w=400/ejemplares/88/photo-id.jpg",
        "w=800/ejemplares/88/photo-id.jpg",
    ]
