# app/services/species_service.py
from typing import List, Optional, Dict, Any
from app.core.supabase_auth import get_public

PUBLIC_SPECIES_FIELDS = [
    "id", "slug", "nombre_común", "scientific_name",
    "habitat", "estado_conservación", "tipo_planta", "distribución", "floración", "cuidado", "usos"
]
STAFF_EXTRA_FIELDS = [
    "historia_y_leyendas", "historia_nombre", "Endémica", "expectativa_vida", "tipo_morfología", "created_at", "updated_at"
]

def _cover_photo_map(species_ids: List[int]) -> Dict[int, Optional[str]]:
    if not species_ids:
        return {}
    sb = get_public()
    photos = sb.table("fotos_especies") \
        .select("especie_id, storage_path, is_cover, order_index") \
        .in_("especie_id", species_ids).execute()
    by_sid: Dict[int, List[Dict[str, Any]]] = {}
    for p in (photos.data or []):
        by_sid.setdefault(p["especie_id"], []).append(p)
    out: Dict[int, Optional[str]] = {}
    for sid, plist in by_sid.items():
        chosen = None
        for p in plist:
            if p.get("is_cover"):
                chosen = p["storage_path"]; break
        if chosen is None:
            plist_sorted = sorted(plist, key=lambda x: (x.get("order_index") or 0))
            if plist_sorted:
                chosen = plist_sorted[0]["storage_path"]
        out[sid] = chosen
    return out

# ----------------- PÚBLICO -----------------

def list_public(q: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    sb = get_public()
    query = sb.table("especies").select(",".join(PUBLIC_SPECIES_FIELDS))
    if q:
        # Busca por nombre común o científico
        query = query.or_(f"nombre_común.ilike.%{q}%,scientific_name.ilike.%{q}%")
    res = query.order("nombre_común", desc=False).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    cover = _cover_photo_map([r["id"] for r in rows])
    out = []
    for r in rows:
        out.append({**r, "cover_photo": cover.get(r["id"])})
    return out

def get_public_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    sb = get_public()
    res = sb.table("especies").select(",".join(PUBLIC_SPECIES_FIELDS)).eq("slug", slug).limit(1).execute()
    if not res.data:
        return None
    species = res.data[0]
    # Todas las fotos
    photos = sb.table("fotos_especies").select("id, storage_path, is_cover, order_index").eq("especie_id", species["id"]).order("order_index").execute()
    species["photos"] = photos.data or []
    return species

# ----------------- STAFF (privado) -----------------

def list_staff(q: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    sb = get_public()
    fields = PUBLIC_SPECIES_FIELDS + STAFF_EXTRA_FIELDS
    query = sb.table("especies").select(",".join(fields))
    if q:
        query = query.or_(f"nombre_común.ilike.%{q}%,scientific_name.ilike.%{q}%")
    res = query.order("updated_at", desc=True).range(offset, offset + limit - 1).execute()
    return res.data or []

def get_staff(species_id: int) -> Optional[Dict[str, Any]]:
    sb = get_public()
    fields = PUBLIC_SPECIES_FIELDS + STAFF_EXTRA_FIELDS
    res = sb.table("especies").select(",".join(fields)).eq("id", species_id).limit(1).execute()
    return res.data[0] if res.data else None

def create_staff(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Validar slug único
    sb = get_public()
    if not payload.get("slug"):
        raise ValueError("slug es obligatorio")
    exists = sb.table("especies").select("id").eq("slug", payload["slug"]).limit(1).execute()
    if exists.data:
        raise ValueError("slug ya existe")
    res = sb.table("especies").insert(payload).execute()
    return res.data[0]

def update_staff(species_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_public()
    if "slug" in payload and payload["slug"]:
        exists = sb.table("especies").select("id").eq("slug", payload["slug"]).neq("id", species_id).limit(1).execute()
        if exists.data:
            raise ValueError("slug ya existe en otra especie")
    res = sb.table("especies").update(payload).eq("id", species_id).execute()
    if not res.data:
        raise LookupError("Especie no encontrada")
    return res.data[0]

def delete_admin(species_id: int) -> None:
    sb = get_public()
    # (Opcional: validar dependencias: ejemplar, fotos_especies, purchase_items, etc.)
    sb.table("especies").delete().eq("id", species_id).execute()
