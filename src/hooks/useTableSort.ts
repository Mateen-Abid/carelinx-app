import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type SortConfig<T> = {
  key: keyof T | string;
  direction: SortDirection;
};

export function useTableSort<T>(data: T[], defaultSort?: SortConfig<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    defaultSort || null
  );

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return data || [];
    }
    
    if (!sortConfig || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      // Handle Date objects and date strings
      const aDate = aValue instanceof Date ? aValue : new Date(aValue);
      const bDate = bValue instanceof Date ? bValue : new Date(bValue);
      
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return sortConfig.direction === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    } else if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'desc'
    ) {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const getSortDirection = (key: keyof T | string): SortDirection => {
    if (sortConfig && sortConfig.key === key) {
      return sortConfig.direction;
    }
    return null;
  };

  return {
    sortedData,
    handleSort,
    getSortDirection,
    sortConfig,
  };
}

// Helper function to get nested values (e.g., 'user.name' or 'clinic.name')
function getNestedValue(obj: any, path: string | keyof typeof obj): any {
  if (typeof path === 'string' && path.includes('.')) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
  return obj[path];
}

