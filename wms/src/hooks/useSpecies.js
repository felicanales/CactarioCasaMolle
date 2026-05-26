"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/context/AuthContext";
import { getApiUrl } from "../utils/api-config";

const API = getApiUrl();

export function useSpeciesList(params = {}) {
  const { apiRequest } = useAuth();
  const { q, limit = 100, offset = 0 } = params;

  return useQuery({
    queryKey: ["species", "list", q, limit, offset],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      search.set("limit", limit);
      search.set("offset", offset);
      const res = await apiRequest(`${API}/species/staff?${search}`);
      if (!res.ok) throw new Error("Error al cargar especies");
      return res.json();
    },
    enabled: true,
  });
}

export function useSpecies(speciesId) {
  const { apiRequest } = useAuth();

  return useQuery({
    queryKey: ["species", speciesId],
    queryFn: async () => {
      const res = await apiRequest(`${API}/species/staff/${speciesId}`);
      if (!res.ok) throw new Error("Error al cargar especie");
      return res.json();
    },
    enabled: !!speciesId,
  });
}

export function useCreateSpecies() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiRequest(`${API}/species/staff`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear especie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["species"] });
    },
  });
}

export function useUpdateSpecies() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiRequest(`${API}/species/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al actualizar especie");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["species"] });
      queryClient.invalidateQueries({ queryKey: ["species", id] });
    },
  });
}

export function useDeleteSpecies() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest(`${API}/species/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar especie");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["species"] });
    },
  });
}
