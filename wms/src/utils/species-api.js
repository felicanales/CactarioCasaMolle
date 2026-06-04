"use client";

import { getApiUrl } from "./api-config";

const API = getApiUrl();
const SPECIES_PAGE_SIZE = 100;

function buildSpeciesSearchParams(params = {}, page = {}) {
  const search = new URLSearchParams();
  const merged = { ...params, ...page };

  Object.entries(merged).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "all") return;
    search.set(key, String(value));
  });

  return search;
}

async function fetchSpeciesPage(apiRequest, params = {}) {
  const search = buildSpeciesSearchParams(params);
  const res = await apiRequest(`${API}/species/staff?${search}`);
  if (!res.ok) {
    const error = new Error("Error al cargar especies");
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchAllStaffSpecies(apiRequest, params = {}, options = {}) {
  const pageSize = options.pageSize || SPECIES_PAGE_SIZE;
  const baseParams = { ...params };
  delete baseParams.limit;
  delete baseParams.offset;

  const allSpecies = [];
  let offset = 0;

  while (true) {
    const page = await fetchSpeciesPage(apiRequest, {
      ...baseParams,
      limit: pageSize,
      offset,
    });

    allSpecies.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allSpecies;
}

export async function fetchStaffSpeciesPage(apiRequest, params = {}) {
  return fetchSpeciesPage(apiRequest, {
    limit: SPECIES_PAGE_SIZE,
    offset: 0,
    ...params,
  });
}
