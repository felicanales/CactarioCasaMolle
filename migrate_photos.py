#!/usr/bin/env python3
from __future__ import annotations

"""
migrate_photos.py - CactarioCasaMolle

Extracts embedded images from the species Excel file and uploads them through
the existing FastAPI photo endpoints.

Default mode is dry-run and processes only the first 3 species.
"""

import argparse
import csv
import getpass
import importlib
import io
import os
import posixpath
import re
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile


PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data" / "photo-migration"
EXCEL_PATH = DATA_DIR / "Especies de cactus CasaMolle (2).xlsx"
OUTPUT_CSV = DATA_DIR / "migracion_resultado.csv"

SHEET_NAME = "Copia de cactus faltantes"
NOMBRE_COL = 8  # Column H, 1-indexed.
PHOTO_COL_MIN = 0  # Column A, openpyxl image anchors are 0-indexed.
PHOTO_COL_MAX = 6  # Column G.

DEFAULT_TEST_BATCH = 3
DELAY_SEC = 0.4
GET_TIMEOUT_SEC = 20
UPLOAD_TIMEOUT_SEC = 120
UPLOAD_RETRIES = 3
RETRY_BACKOFF_SEC = 1.5

REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
SHEET_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OFFICE_REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
XDR_NS = "{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}"
A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

Photo = tuple[bytes, str, str]  # bytes, extension, mime type


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def read_config(dry_run: bool) -> tuple[str, str | None]:
    api_base = os.environ.get("CACTARIO_API_URL", "").strip().rstrip("/")
    if not api_base:
        fail(
            "Falta CACTARIO_API_URL. Ejemplo: "
            '$env:CACTARIO_API_URL="https://tu-api.railway.app"'
        )

    auth_token = None
    if not dry_run:
        auth_token = os.environ.get("CACTARIO_AUTH_TOKEN", "").strip()

    return api_base, auth_token


def load_dependencies() -> tuple[object, object]:
    missing: list[str] = []

    try:
        openpyxl_module = importlib.import_module("openpyxl")
    except ModuleNotFoundError:
        openpyxl_module = None
        missing.append("openpyxl")

    try:
        requests_module = importlib.import_module("requests")
    except ModuleNotFoundError:
        requests_module = None
        missing.append("requests")

    if missing:
        fail(
            "Faltan dependencias: "
            + ", ".join(missing)
            + ". Instala con: python -m pip install -r requirements_migration.txt"
        )

    return openpyxl_module, requests_module


def build_session(requests_module: object, auth_token: str | None = None):
    session = requests_module.Session()
    session.headers["User-Agent"] = "cactario-photo-migration/1.0"
    if auth_token:
        session.headers["Authorization"] = f"Bearer {auth_token}"
    return session


def response_detail(response: object) -> str:
    """Return a short API error detail without exposing credentials."""
    try:
        data = response.json()
    except ValueError:
        return getattr(response, "text", "")[:300]

    if isinstance(data, dict):
        detail = data.get("detail") or data.get("message")
        if isinstance(detail, dict):
            return str(detail.get("message") or detail.get("code") or detail)[:300]
        if detail:
            return str(detail)[:300]
    return str(data)[:300]


def prompt_required(label: str, secret: bool = False) -> str:
    value = getpass.getpass(label) if secret else input(label)
    value = value.strip()
    if not value:
        fail(f"Valor requerido: {label.strip(': ')}")
    return value


def login_with_otp(api_base: str, requests_module: object):
    """
    Interactive staff login using existing OTP endpoints.
    The access token stays only in this process memory.
    """
    print("\nCACTARIO_AUTH_TOKEN no esta definido; se usara login OTP interactivo.")
    email = prompt_required("Email staff: ").lower()

    session = build_session(requests_module)
    try:
        response = session.post(
            f"{api_base}/auth/request-otp",
            json={"email": email},
            timeout=GET_TIMEOUT_SEC,
        )
    except requests_module.RequestException as error:
        fail(f"No se pudo solicitar OTP: {error}")

    if response.status_code not in {200, 204}:
        fail(f"No se pudo solicitar OTP: {response.status_code} {response_detail(response)}")

    print("OTP enviado. Revisa el correo staff e ingresa el codigo de 6 digitos.")
    code = prompt_required("Codigo OTP: ", secret=True)

    try:
        response = session.post(
            f"{api_base}/auth/verify-otp",
            json={"email": email, "code": code},
            timeout=GET_TIMEOUT_SEC,
        )
    except requests_module.RequestException as error:
        fail(f"No se pudo verificar OTP: {error}")

    if response.status_code != 200:
        fail(f"OTP invalido o expirado: {response.status_code} {response_detail(response)}")

    try:
        data = response.json()
    except ValueError:
        fail("La verificacion OTP devolvio JSON invalido.")

    if not isinstance(data, dict) or not data.get("access_token"):
        fail("La verificacion OTP no devolvio una sesion staff valida.")

    session.headers["Authorization"] = f"Bearer {data['access_token']}"
    user = data.get("user") if isinstance(data.get("user"), dict) else {}
    print(f"Login OTP aceptado: {user.get('email') or email}")
    return session


def name_to_slug(name: str) -> str:
    """
    Match the WMS and migration slug logic:
    scientific_name.toLowerCase().replace(/\\s+/g, "-").replace(/[^\\w\\-]/g, "")
    with ASCII regex semantics.
    """
    slug = (name or "").strip().lower()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^\w\-]", "", slug, flags=re.ASCII)
    return slug


def get_species_id(
    api_base: str,
    slug: str,
    session: object,
    requests_module: object,
) -> int | None:
    """Return the species id from GET /species/public/{slug}, or None."""
    url = f"{api_base}/species/public/{slug}"
    try:
        response = session.get(url, timeout=GET_TIMEOUT_SEC)
    except requests_module.RequestException as error:
        print(f"   ERROR lookup slug '{slug}': {error}")
        return None

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        print(f"   ERROR lookup slug '{slug}' -> {response.status_code}: {response.text[:300]}")
        return None

    try:
        data = response.json()
    except ValueError:
        print(f"   ERROR lookup slug '{slug}' devolvio JSON invalido")
        return None

    if not isinstance(data, dict):
        print(f"   ERROR lookup slug '{slug}' devolvio un shape inesperado")
        return None

    species_id = data.get("id")
    if species_id is None:
        print(f"   ERROR lookup slug '{slug}' no contiene campo id")
        return None

    try:
        return int(species_id)
    except (TypeError, ValueError):
        print(f"   ERROR lookup slug '{slug}' contiene id invalido: {species_id!r}")
        return None


def validate_auth_session(
    api_base: str,
    session: object,
    requests_module: object,
    auth_label: str,
) -> None:
    """Fail fast if the staff session is missing, expired, or inactive."""
    url = f"{api_base}/auth/me"
    try:
        response = session.get(url, timeout=GET_TIMEOUT_SEC)
    except requests_module.RequestException as error:
        fail(f"No se pudo validar {auth_label} contra /auth/me: {error}")

    if response.status_code == 403:
        fail(f"{auth_label} pertenece a un usuario inactivo.")
    if response.status_code != 200:
        fail(f"No se pudo validar {auth_label}: {response.status_code} {response_detail(response)}")

    try:
        data = response.json()
    except ValueError:
        fail(f"No se pudo validar {auth_label}: /auth/me devolvio JSON invalido.")

    if not isinstance(data, dict) or data.get("authenticated") is not True:
        message = data.get("message") if isinstance(data, dict) else None
        fail(f"{auth_label} invalido o expirado. {message or ''}".strip())

    email = data.get("email") or "usuario staff"
    print(f"Sesion staff validada: {email}")


def get_photo_count(api_base: str, species_id: int, session: object) -> int | None:
    """Return current photo count for a species, or None if the check fails."""
    try:
        response = session.get(f"{api_base}/photos/especie/{species_id}", timeout=GET_TIMEOUT_SEC)
        if response.status_code != 200:
            return None
        data = response.json()
    except Exception:
        return None

    if isinstance(data, dict) and isinstance(data.get("count"), int):
        return data["count"]
    if isinstance(data, dict) and isinstance(data.get("photos"), list):
        return len(data["photos"])
    return None


def detect_image_type(img_bytes: bytes) -> tuple[str, str]:
    """Return (extension, mime_type) from common image signatures."""
    if img_bytes.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image/jpeg"
    if img_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image/png"
    if img_bytes.startswith(b"GIF87a") or img_bytes.startswith(b"GIF89a"):
        return ".gif", "image/gif"
    if img_bytes.startswith(b"RIFF") and img_bytes[8:12] == b"WEBP":
        return ".webp", "image/webp"
    if img_bytes.startswith(b"BM"):
        return ".bmp", "image/bmp"
    return ".jpg", "image/jpeg"


def read_openpyxl_image_bytes(img: object) -> bytes:
    """
    Read bytes from an openpyxl image object.
    Prefer _data(), then fall back to ref for older openpyxl object shapes.
    """
    data_reader = getattr(img, "_data", None)
    if callable(data_reader):
        data = data_reader()
        if isinstance(data, bytes):
            return data
        if hasattr(data, "read"):
            data.seek(0)
            return data.read()

    ref = getattr(img, "ref", None)
    if hasattr(ref, "read"):
        ref.seek(0)
        return ref.read()
    if isinstance(ref, (bytes, bytearray)):
        return bytes(ref)

    raise ValueError("No se pudo leer la imagen embebida desde openpyxl")


def extract_species_images_openpyxl(ws) -> dict[str, list[Photo]]:
    """
    Group embedded worksheet images by row, using only A-G for photos and H for
    the scientific name.
    """
    rows: dict[int, list[tuple[int, object]]] = {}
    for img in getattr(ws, "_images", []):
        anchor = getattr(img, "anchor", None)
        marker = getattr(anchor, "_from", None)
        if marker is None:
            continue

        row = marker.row
        col = marker.col
        if PHOTO_COL_MIN <= col <= PHOTO_COL_MAX:
            rows.setdefault(row, []).append((col, img))

    species_map: dict[str, list[Photo]] = {}
    skipped_without_name = 0
    skipped_images = 0

    for row_idx in sorted(rows):
        nombre_raw = ws.cell(row=row_idx + 1, column=NOMBRE_COL).value
        if not nombre_raw or not str(nombre_raw).strip():
            skipped_without_name += 1
            continue

        nombre = str(nombre_raw).strip()
        photos = species_map.setdefault(nombre, [])

        for _, img in sorted(rows[row_idx], key=lambda item: item[0]):
            try:
                img_bytes = read_openpyxl_image_bytes(img)
            except Exception as error:
                skipped_images += 1
                print(f"   AVISO fila {row_idx + 1}: imagen ignorada ({error})")
                continue

            ext, mime_type = detect_image_type(img_bytes)
            photos.append((img_bytes, ext, mime_type))

    if skipped_without_name:
        print(f"   AVISO: {skipped_without_name} fila(s) ignoradas sin NOMBRE REAL")
    if skipped_images:
        print(f"   AVISO: {skipped_images} imagen(es) no se pudieron leer")

    return species_map


def rels_path_for_part(part_path: str) -> str:
    directory = posixpath.dirname(part_path)
    filename = posixpath.basename(part_path)
    return posixpath.join(directory, "_rels", f"{filename}.rels")


def resolve_part_target(source_part: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(source_part), target))


def read_rels(archive: ZipFile, source_part: str) -> list[ET.Element]:
    rels_path = rels_path_for_part(source_part)
    if rels_path not in archive.namelist():
        return []
    root = ET.fromstring(archive.read(rels_path))
    return list(root.findall(f"{REL_NS}Relationship"))


def find_sheet_part(archive: ZipFile, sheet_name: str) -> str | None:
    workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
    workbook_rels = {
        rel.attrib["Id"]: resolve_part_target("xl/workbook.xml", rel.attrib["Target"])
        for rel in read_rels(archive, "xl/workbook.xml")
    }

    sheets = workbook_root.find(f"{SHEET_NS}sheets")
    if sheets is None:
        return None

    for sheet in sheets:
        if sheet.attrib.get("name") == sheet_name:
            rel_id = sheet.attrib.get(f"{OFFICE_REL_NS}id")
            return workbook_rels.get(rel_id)

    return None


def find_drawing_part(archive: ZipFile, sheet_part: str) -> str | None:
    for rel in read_rels(archive, sheet_part):
        if rel.attrib.get("Type", "").endswith("/drawing"):
            return resolve_part_target(sheet_part, rel.attrib["Target"])
    return None


def extract_species_images_from_package(
    xlsx_path: Path,
    sheet_name: str,
    ws,
) -> dict[str, list[Photo]]:
    """
    Fallback for Excel files whose drawings are not exposed by openpyxl.
    Reads worksheet drawing anchors directly from the XLSX package.
    """
    rows: dict[int, list[tuple[int, Photo]]] = {}

    try:
        with ZipFile(xlsx_path) as archive:
            sheet_part = find_sheet_part(archive, sheet_name)
            if not sheet_part:
                print("   AVISO: no se encontro la hoja en el paquete XLSX")
                return {}

            drawing_part = find_drawing_part(archive, sheet_part)
            if not drawing_part:
                print("   AVISO: la hoja no tiene dibujos/fotos asociados")
                return {}

            media_by_rel_id = {
                rel.attrib["Id"]: resolve_part_target(drawing_part, rel.attrib["Target"])
                for rel in read_rels(archive, drawing_part)
                if rel.attrib.get("Type", "").endswith("/image")
            }

            drawing_root = ET.fromstring(archive.read(drawing_part))
            missing_media = 0

            for anchor in list(drawing_root):
                if not anchor.tag.endswith("Anchor"):
                    continue

                from_node = anchor.find(f"{XDR_NS}from")
                if from_node is None:
                    continue

                row_node = from_node.find(f"{XDR_NS}row")
                col_node = from_node.find(f"{XDR_NS}col")
                blip_node = anchor.find(f".//{A_NS}blip")
                if row_node is None or col_node is None or blip_node is None:
                    continue

                try:
                    row_idx = int(row_node.text or "")
                    col_idx = int(col_node.text or "")
                except ValueError:
                    continue

                if not (PHOTO_COL_MIN <= col_idx <= PHOTO_COL_MAX):
                    continue

                rel_id = blip_node.attrib.get(f"{OFFICE_REL_NS}embed")
                media_path = media_by_rel_id.get(rel_id)
                if not media_path:
                    missing_media += 1
                    continue

                try:
                    img_bytes = archive.read(media_path)
                except KeyError:
                    missing_media += 1
                    continue

                ext, mime_type = detect_image_type(img_bytes)
                rows.setdefault(row_idx, []).append((col_idx, (img_bytes, ext, mime_type)))
    except Exception as error:
        print(f"   AVISO: no se pudieron extraer fotos desde el paquete XLSX ({error})")
        return {}

    species_map: dict[str, list[Photo]] = {}
    skipped_without_name = 0

    for row_idx in sorted(rows):
        nombre_raw = ws.cell(row=row_idx + 1, column=NOMBRE_COL).value
        if not nombre_raw or not str(nombre_raw).strip():
            skipped_without_name += len(rows[row_idx])
            continue

        nombre = str(nombre_raw).strip()
        photos = species_map.setdefault(nombre, [])
        for _, photo in sorted(rows[row_idx], key=lambda item: item[0]):
            photos.append(photo)

    if skipped_without_name:
        print(f"   AVISO: {skipped_without_name} imagen(es) ignoradas en filas sin NOMBRE REAL")
    if "missing_media" in locals() and missing_media:
        print(f"   AVISO: {missing_media} imagen(es) sin archivo media asociado")

    return species_map


def extract_species_images(
    xlsx_path: Path,
    sheet_name: str,
    ws,
) -> dict[str, list[Photo]]:
    species_map = extract_species_images_openpyxl(ws)
    if species_map:
        return species_map

    print("   openpyxl no expuso imagenes; leyendo drawings internos del XLSX...")
    return extract_species_images_from_package(xlsx_path, sheet_name, ws)


def upload_photo(
    api_base: str,
    species_id: int,
    photo: Photo,
    index: int,
    session: object,
    requests_module: object,
) -> dict[str, object]:
    """Upload one species photo to POST /photos/especie/{species_id}."""
    img_bytes, extension, mime_type = photo
    filename = f"foto_{index + 1:02d}{extension}"
    url = f"{api_base}/photos/especie/{species_id}"
    headers = dict(getattr(session, "headers", {}))
    headers["Connection"] = "close"
    before_count = get_photo_count(api_base, species_id, session)
    last_error = ""

    for attempt in range(1, UPLOAD_RETRIES + 1):
        files = [("files", (filename, io.BytesIO(img_bytes), mime_type))]
        try:
            response = requests_module.post(
                url,
                files=files,
                headers=headers,
                timeout=UPLOAD_TIMEOUT_SEC,
            )
        except requests_module.RequestException as error:
            last_error = str(error)
            after_count = get_photo_count(api_base, species_id, session)
            if before_count is not None and after_count is not None and after_count > before_count:
                return {
                    "ok": True,
                    "status": "uploaded_response_lost",
                    "body": f"Sin respuesta final, pero el conteo subio de {before_count} a {after_count}.",
                }
            if attempt < UPLOAD_RETRIES:
                time.sleep(RETRY_BACKOFF_SEC * attempt)
                continue
            return {"ok": False, "status": 0, "body": last_error}

        body = response.text[:500]
        parsed = None
        try:
            parsed = response.json()
        except ValueError:
            pass

        ok_shape = False
        if isinstance(parsed, dict):
            photos = parsed.get("photos")
            count = parsed.get("count")
            ok_shape = (isinstance(count, int) and count > 0) or (
                isinstance(photos, list) and len(photos) > 0
            )

        if 200 <= response.status_code < 300 and ok_shape:
            return {
                "ok": True,
                "status": response.status_code,
                "body": body,
            }

        retriable_status = response.status_code in {429, 500, 502, 503, 504}
        if retriable_status and attempt < UPLOAD_RETRIES:
            after_count = get_photo_count(api_base, species_id, session)
            if before_count is not None and after_count is not None and after_count > before_count:
                return {
                    "ok": True,
                    "status": "uploaded_response_lost",
                    "body": f"Sin respuesta final, pero el conteo subio de {before_count} a {after_count}.",
                }
            time.sleep(RETRY_BACKOFF_SEC * attempt)
            continue

        return {
            "ok": False,
            "status": response.status_code,
            "body": body,
        }

    return {"ok": False, "status": 0, "body": last_error or "upload failed"}


def write_results_csv(results: list[dict[str, object]]) -> None:
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["nombre", "slug", "species_id", "fotos_subidas", "errores"],
        )
        writer.writeheader()
        writer.writerows(results)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migracion de fotos CactarioCasaMolle")
    parser.add_argument(
        "--no-dry-run",
        action="store_true",
        help=(
            "Sube realmente las fotos. Si no existe CACTARIO_AUTH_TOKEN, "
            "pide login OTP interactivo."
        ),
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Procesa todas las especies. Por defecto procesa solo 3.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dry_run = not args.no_dry_run
    test_batch = 0 if args.all else DEFAULT_TEST_BATCH
    api_base, auth_token = read_config(dry_run)
    openpyxl_module, requests_module = load_dependencies()

    print("=" * 60)
    print("  CactarioCasaMolle - Migracion de Fotos")
    print(f"  DRY RUN: {dry_run}")
    print(f"  Modo: {'COMPLETO' if test_batch == 0 else f'PRUEBA ({test_batch} especies)'}")
    print(f"  API: {api_base}")
    print("=" * 60)

    if not dry_run:
        if auth_token:
            print()
            print(
                "AVISO: usando CACTARIO_AUTH_TOKEN desde el entorno. "
                "Recomendado solo para automatizacion controlada."
            )
            session = build_session(requests_module, auth_token)
            validate_auth_session(api_base, session, requests_module, "CACTARIO_AUTH_TOKEN")
        else:
            session = login_with_otp(api_base, requests_module)
            validate_auth_session(api_base, session, requests_module, "sesion OTP")
    else:
        session = build_session(requests_module)

    if not EXCEL_PATH.exists():
        fail(f"No se encuentra el Excel: {EXCEL_PATH}")

    workbook = openpyxl_module.load_workbook(EXCEL_PATH)
    if SHEET_NAME not in workbook.sheetnames:
        fail(f"Sheet '{SHEET_NAME}' no encontrada. Disponibles: {workbook.sheetnames}")

    ws = workbook[SHEET_NAME]
    print(f"\nCargando: {EXCEL_PATH}")
    print(f"Sheet: '{SHEET_NAME}' - {ws.max_row} filas, {len(getattr(ws, '_images', []))} imagenes detectadas por openpyxl")

    print("\nExtrayendo imagenes...")
    species_map = extract_species_images(EXCEL_PATH, SHEET_NAME, ws)
    total_imgs = sum(len(photos) for photos in species_map.values())
    print(f"   -> {len(species_map)} especies | {total_imgs} imagenes en A-G")

    items = list(species_map.items())
    if test_batch > 0:
        items = items[:test_batch]
        print(f"\nMODO PRUEBA: procesando las primeras {test_batch} especies")

    results: list[dict[str, object]] = []

    print()
    for nombre, photos in items:
        slug = name_to_slug(nombre)
        print(f"-- {nombre}")
        print(f"   slug: {slug} | fotos: {len(photos)}")

        species_id = get_species_id(api_base, slug, session, requests_module)
        if not species_id:
            print("   ERROR: especie no encontrada en DB")
            results.append(
                {
                    "nombre": nombre,
                    "slug": slug,
                    "species_id": "",
                    "fotos_subidas": 0,
                    "errores": "not_found_in_db",
                }
            )
            continue

        print(f"   species_id: {species_id}")
        uploaded = 0
        errors: list[str] = []

        for index, photo in enumerate(photos):
            img_bytes, extension, mime_type = photo
            label = f"foto_{index + 1:02d}{extension} ({len(img_bytes):,} bytes, {mime_type})"
            if dry_run:
                print(f"   [DRY RUN] subiria {label}")
                uploaded += 1
                continue

            result = upload_photo(api_base, species_id, photo, index, session, requests_module)
            if result["ok"]:
                print(f"   OK {label} -> {result['status']}")
                uploaded += 1
            else:
                print(f"   ERROR {label} -> {result['status']}: {result['body']}")
                errors.append(f"foto_{index + 1}:{result['status']}")

            time.sleep(DELAY_SEC)

        results.append(
            {
                "nombre": nombre,
                "slug": slug,
                "species_id": species_id,
                "fotos_subidas": uploaded,
                "errores": "; ".join(errors),
            }
        )

    write_results_csv(results)

    ok_count = sum(1 for row in results if not row["errores"])
    err_count = len(results) - ok_count
    print("\n" + "=" * 60)
    print(f"  Resultados guardados -> {OUTPUT_CSV}")
    print(f"  OK: {ok_count} especies sin errores")
    if err_count:
        print(f"  ERROR: {err_count} con errores (ver CSV)")
    if dry_run:
        print()
        print("  DRY RUN activo - no se subio ninguna foto.")
        print("  Para subir 3 especies: python migrate_photos.py --no-dry-run")
        print("  Para subir todo: python migrate_photos.py --no-dry-run --all")
    print("=" * 60)


if __name__ == "__main__":
    main()
