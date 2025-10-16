# app/services/sectors_service.py
from typing import List, Optional, Dict, Any, Set
from app.core.supabase_auth import get_public

PUBLIC_SECTOR_FIELDS = ["id", "name", "description", "location", "qr_code"]
STAFF_SECTOR_FIELDS = PUBLIC_SECTOR_FIELDS + ["created_at", "updated_at"]

def list_public(q: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS))
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.order("name").execute()
    return res.data or []

def get_public_by_qr(qr_code: str) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("sectores").select(",".join(PUBLIC_SECTOR_FIELDS)).eq("qr_code", qr_code).limit(1).execute()
    return res.data[0] if res.data else None

def _get_sector_id_by_qr(qr_code: str) -> Optional[int]:
    sb = get_public()
    r = sb.table("sectores").select("id").eq("qr_code", qr_code).limit(1).execute()
    return r.data[0]["id"] if r.data else None

def list_species_public_by_sector_qr(qr_code: str) -> List[Dict[str, Any]]:
    """
    Devuelve especies (campos públicos) presentes en el sector identificado por 'qr_code'.
    Campos: id, slug, scientific_name, nombre_común + cover_photo (si existe).
    """
    sb = get_public()
    sector_id = _get_sector_id_by_qr(qr_code)
    if not sector_id:
        return []

    # 1) Traer species_id desde ejemplar por sector
    ej = sb.table("ejemplar").select("species_id").eq("sector_id", sector_id).execute()
    species_ids: Set[int] = set([row["species_id"] for row in (ej.data or []) if row.get("species_id")])

    if not species_ids:
        return []

    # 2) Traer especies públicas por IDs
    #    NOTA: nombres en tu schema: scientific_name, nombre_común, slug
    sp = sb.table("especies").select("id, slug, scientific_name, nombre_común").in_("id", list(species_ids)).execute()
    species = sp.data or []

    # 3) Traer foto de portada por especie (is_cover true o menor order_index)
    cover_map: Dict[int, Optional[str]] = {}
    if species:
        ids = [s["id"] for s in species]
        photos = sb.table("fotos_especies").select("especie_id, storage_path, is_cover, order_index").in_("especie_id", ids).execute()
        # Elegir portada: primero is_cover=True; si no hay, la de menor order_index
        by_species: Dict[int, List[Dict[str, Any]]] = {}
        for p in (photos.data or []):
            by_species.setdefault(p["especie_id"], []).append(p)
        for sid, plist in by_species.items():
            chosen = None
            # 1) portada explícita
            for p in plist:
                if p.get("is_cover"):
                    chosen = p["storage_path"]; break
            # 2) si no, menor orden
            if chosen is None:
                plist_sorted = sorted(plist, key=lambda x: (x.get("order_index") or 0))
                if plist_sorted:
                    chosen = plist_sorted[0]["storage_path"]
            cover_map[sid] = chosen

    # 4) Adjuntar cover_photo
    out = []
    for s in species:
        out.append({
            "id": s["id"],
            "slug": s["slug"],
            "scientific_name": s["scientific_name"],
            "nombre_común": s.get("nombre_común"),
            "cover_photo": cover_map.get(s["id"]),
        })
    # ordenar por nombre común o científico
    out.sort(key=lambda x: (x["nombre_común"] or x["scientific_name"]).lower())
    return out

# ----------------- STAFF (privado) -----------------

def list_staff(q: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("sectores").select(",".join(STAFF_SECTOR_FIELDS))
    if q:
        query = query.ilike("name", f"%{q}%")
    res = query.order("name").execute()
    return res.data or []

def get_staff(sector_id: int) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("sectores").select(",".join(STAFF_SECTOR_FIELDS)).eq("id", sector_id).limit(1).execute()
    return res.data[0] if res.data else None

def create_staff(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Validar unicidad de qr_code si viene definido
    sb = get_public()
    if payload.get("qr_code"):
        exists = sb.table("sectores").select("id").eq("qr_code", payload["qr_code"]).limit(1).execute()
        if exists.data:
            raise ValueError("qr_code ya existe")
    res = sb.table("sectores").insert(payload).execute()
    return res.data[0]

def update_staff(sector_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_public()
    if "qr_code" in payload and payload["qr_code"]:
        exists = sb.table("sectores").select("id").eq("qr_code", payload["qr_code"]).neq("id", sector_id).limit(1).execute()
        if exists.data:
            raise ValueError("qr_code ya existe en otro sector")
    res = sb.table("sectores").update(payload).eq("id", sector_id).execute()
    if not res.data:
        raise LookupError("Sector no encontrado")
    return res.data[0]

def delete_admin(sector_id: int) -> None:
    sb = get_public()
    # (Opcional: validar que no tenga ejemplares asociados)
    sb.table("sectores").delete().eq("id", sector_id).execute()
