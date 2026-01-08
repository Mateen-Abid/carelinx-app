import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortDirection } from '@/hooks/useTableSort';

interface TableSortHeaderProps {
  children: React.ReactNode;
  sortDirection: SortDirection;
  onSort: () => void;
  className?: string;
}

export const TableSortHeader = ({
  children,
  sortDirection,
  onSort,
  className = '',
}: TableSortHeaderProps) => {
  const getSortIcon = () => {
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-3.5 h-3.5 ml-1" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-gray-400 dark:text-gray-500" />;
  };

  return (
    <th
      className={`text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none ${className}`}
      onClick={onSort}
    >
      <div className="flex items-center">
        {children}
        {getSortIcon()}
      </div>
    </th>
  );
};

