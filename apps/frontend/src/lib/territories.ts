'use client';

export type TerritoryRecord = {
  id: string;
  name: string;
  type: 'province' | 'city';
  parentId: string | null;
};

async function fetchTerritories(params: {
  type?: 'province' | 'city';
  parentId?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.type) {
    searchParams.set('type', params.type);
  }

  if (params.parentId) {
    searchParams.set('parentId', params.parentId);
  }

  const response = await fetch(`/api/territories?${searchParams}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | TerritoryRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch territories.'
        : 'Failed to fetch territories.',
    );
  }

  return payload;
}

export function fetchProvinces() {
  return fetchTerritories({ type: 'province' });
}

export function fetchCitiesByProvince(provinceId: string) {
  return fetchTerritories({ type: 'city', parentId: provinceId });
}
