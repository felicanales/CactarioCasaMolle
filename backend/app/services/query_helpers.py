from typing import Any, Callable, Iterable, List, Optional, Sequence, TypeVar


SUPABASE_PAGE_SIZE = 100
SUPABASE_IN_CHUNK_SIZE = 100

T = TypeVar("T")


def unique_values(values: Iterable[T]) -> List[T]:
    seen = set()
    out: List[T] = []
    for value in values:
        if value is None or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def chunked(values: Sequence[T], chunk_size: int = SUPABASE_IN_CHUNK_SIZE) -> Iterable[List[T]]:
    for index in range(0, len(values), chunk_size):
        yield list(values[index:index + chunk_size])


def fetch_all_pages(
    build_query: Callable[[], Any],
    page_size: int = SUPABASE_PAGE_SIZE,
    max_rows: Optional[int] = None,
) -> List[dict]:
    rows: List[dict] = []
    offset = 0

    while True:
        effective_page_size = page_size
        if max_rows is not None:
            remaining = max_rows - len(rows)
            if remaining <= 0:
                break
            effective_page_size = min(effective_page_size, remaining)

        result = build_query().range(offset, offset + effective_page_size - 1).execute()
        page = result.data or []
        rows.extend(page)

        if len(page) < effective_page_size:
            break

        offset += effective_page_size

    return rows


def fetch_all_by_ids(
    sb: Any,
    table_name: str,
    fields: str,
    id_column: str,
    ids: Iterable[Any],
    order_by: Optional[str] = None,
    page_size: int = SUPABASE_PAGE_SIZE,
    chunk_size: int = SUPABASE_IN_CHUNK_SIZE,
) -> List[dict]:
    rows: List[dict] = []
    clean_ids = unique_values(ids)

    for ids_chunk in chunked(clean_ids, chunk_size):
        def build_query(ids_chunk=ids_chunk):
            query = sb.table(table_name).select(fields).in_(id_column, ids_chunk)
            if order_by:
                query = query.order(order_by)
            return query

        rows.extend(fetch_all_pages(build_query, page_size=page_size))

    return rows
