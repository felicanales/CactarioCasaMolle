"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/context/AuthContext";
import { getApiUrl } from "../utils/api-config";

const API = getApiUrl();

export function useSectorsList(params = {}) {
  const { apiRequest } = useAuth();
  const { q } = params;

  return useQuery({
    queryKey: ["sectors", "list", q],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      const res = await apiRequest(`${API}/sectors/staff?${search}`);
      if (!res.ok) throw new Error("Error al cargar sectores");
      return res.json();
    },
  });
}

export function useSector(sectorId) {
  const { apiRequest } = useAuth();

  return useQuery({
    queryKey: ["sectors", sectorId],
    queryFn: async () => {
      const res = await apiRequest(`${API}/sectors/staff/${sectorId}`);
      if (!res.ok) throw new Error("Error al cargar sector");
      return res.json();
    },
    enabled: !!sectorId,
  });
}

export function useCreateSector() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiRequest(`${API}/sectors/staff`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear sector");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
    },
  });
}

export function useUpdateSector() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiRequest(`${API}/sectors/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al actualizar sector");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      queryClient.invalidateQueries({ queryKey: ["sectors", id] });
    },
  });
}

export function useDeleteSector() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest(`${API}/sectors/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar sector");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
    },
  });
}
