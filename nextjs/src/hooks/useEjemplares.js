"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/context/AuthContext";
import { getApiUrl } from "../utils/api-config";

const API = getApiUrl();

export function useEjemplaresList(params = {}) {
  const { apiRequest } = useAuth();
  const {
    q, species_id, sector_id, tamaño, morfologia, nombre_comun,
    health_status, nursery, purchase_date, purchase_date_from, purchase_date_to,
    sort_by = "scientific_name", sort_order = "asc", limit = 50, offset = 0,
  } = params;

  return useQuery({
    queryKey: ["ejemplares", "list", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      if (species_id) search.set("species_id", species_id);
      if (sector_id !== undefined && sector_id !== null) search.set("sector_id", sector_id);
      if (tamaño) search.set("tamaño", tamaño);
      if (morfologia) search.set("morfologia", morfologia);
      if (nombre_comun) search.set("nombre_comun", nombre_comun);
      if (health_status) search.set("health_status", health_status);
      if (nursery) search.set("nursery", nursery);
      if (purchase_date) search.set("purchase_date", purchase_date);
      if (purchase_date_from) search.set("purchase_date_from", purchase_date_from);
      if (purchase_date_to) search.set("purchase_date_to", purchase_date_to);
      search.set("sort_by", sort_by);
      search.set("sort_order", sort_order);
      search.set("limit", limit);
      search.set("offset", offset);

      const res = await apiRequest(`${API}/ejemplar/staff?${search}`);
      if (!res.ok) throw new Error("Error al cargar inventario");
      return res.json(); // { data: [...], total: N }
    },
  });
}

export function useEjemplar(ejemplarId) {
  const { apiRequest } = useAuth();

  return useQuery({
    queryKey: ["ejemplares", ejemplarId],
    queryFn: async () => {
      const res = await apiRequest(`${API}/ejemplar/staff/${ejemplarId}`);
      if (!res.ok) throw new Error("Error al cargar ejemplar");
      return res.json();
    },
    enabled: !!ejemplarId,
  });
}

export function useCreateEjemplar() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiRequest(`${API}/ejemplar/staff`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear ejemplar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ejemplares"] });
    },
  });
}

export function useUpdateEjemplar() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiRequest(`${API}/ejemplar/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al actualizar ejemplar");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["ejemplares"] });
      queryClient.invalidateQueries({ queryKey: ["ejemplares", id] });
    },
  });
}

export function useDeleteEjemplar() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest(`${API}/ejemplar/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar ejemplar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ejemplares"] });
    },
  });
}
