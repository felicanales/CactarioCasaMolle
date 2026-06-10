"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/context/AuthContext";
import { getApiUrl } from "../utils/api-config";

const API = getApiUrl();

async function getApiErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
  }
  return fallback;
}

function invalidateSupportTickets(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
}

export function useSupportTicketsList(params = {}, options = {}) {
  const { apiRequest } = useAuth();
  const { status, type, module, q, limit = 100, offset = 0 } = params;

  return useQuery({
    queryKey: ["support-tickets", "list", status, type, module, q, limit, offset],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (status) search.set("status", status);
      if (type) search.set("type", type);
      if (module) search.set("module", module);
      if (q) search.set("q", q);
      search.set("limit", String(limit));
      search.set("offset", String(offset));

      const res = await apiRequest(`${API}/support-tickets/staff?${search}`);
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Error al cargar tickets"));
      }
      return res.json();
    },
    ...options,
  });
}

export function useSupportTicketSummary(options = {}) {
  const { apiRequest } = useAuth();

  return useQuery({
    queryKey: ["support-tickets", "summary"],
    queryFn: async () => {
      const res = await apiRequest(`${API}/support-tickets/staff/summary`);
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Error al cargar resumen de tickets"));
      }
      return res.json();
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCreateSupportTicket() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiRequest(`${API}/support-tickets/staff`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Error al crear ticket"));
      }
      return res.json();
    },
    onSuccess: () => invalidateSupportTickets(queryClient),
  });
}

export function useUpdateSupportTicket() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiRequest(`${API}/support-tickets/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Error al actualizar ticket"));
      }
      return res.json();
    },
    onSuccess: () => invalidateSupportTickets(queryClient),
  });
}

export function useDeleteSupportTicket() {
  const { apiRequest } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest(`${API}/support-tickets/staff/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Error al eliminar ticket"));
      }
    },
    onSuccess: () => invalidateSupportTickets(queryClient),
  });
}
