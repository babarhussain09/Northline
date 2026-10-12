import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Pagination } from '../types';

export function usePagedList<T>(key: string, path: string, filters: Record<string, string> = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, JSON.stringify(filters)]);

  const query = useQuery({
    queryKey: [key, page, debounced, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries({ page, limit: 20, search: debounced, ...filters }).filter(([, value]) => value !== ''),
      );
      const response = await api.get(path, { params });
      return response.data as { data: T[]; pagination: Pagination };
    },
  });

  return { ...query, page, setPage, search, setSearch };
}
