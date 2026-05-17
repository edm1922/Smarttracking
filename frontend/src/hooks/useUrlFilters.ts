'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * useUrlFilters - A hook to synchronize local state with URL search parameters.
 * Provides getters and setters that automatically update the browser's URL.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = useCallback((name: string, value: string | number | null | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === null || value === undefined || value === '') {
      params.delete(name);
    } else {
      params.set(name, String(value));
    }
    
    // Use replace to avoid polluting browser history with every filter change
    // Set scroll: false to prevent jumping to top of page
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const getFilter = (name: string, defaultValue: string = '') => {
    return searchParams.get(name) || defaultValue;
  };

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { setFilter, getFilter, clearFilters, searchParams };
}
