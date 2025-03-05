import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyStateMessage?: string;
  headerBgColor: string;
  headerTextColor: string;
  rowBgColor: string;
  rowHoverColor?: string;
  borderColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  onRowClick?: (item: T) => void;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyStateMessage = 'No data found',
  headerBgColor,
  headerTextColor,
  rowBgColor,
  rowHoverColor,
  borderColor,
  textPrimaryColor,
  textSecondaryColor,
  onRowClick
}: DataTableProps<T>) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y" style={{ borderColor }}>
          <thead style={{ backgroundColor: headerBgColor }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ 
                    color: headerTextColor,
                    width: column.width || 'auto'
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm"
                    style={{ backgroundColor: rowBgColor }}
                  >
                    <div className="animate-pulse h-4 rounded" style={{ backgroundColor: `${borderColor}40` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Show empty state
  if (!data.length) {
    return (
      <div 
        className="p-6 text-center"
        style={{ color: textSecondaryColor }}
      >
        {emptyStateMessage}
      </div>
    );
  }

  // Render data table
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor }}>
        <thead style={{ backgroundColor: headerBgColor }}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ 
                  color: headerTextColor,
                  width: column.width || 'auto'
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor }}>
          {data.map((item, index) => (
            <tr 
              key={keyExtractor(item, index)}
              className={onRowClick ? 'cursor-pointer transition-colors duration-150' : ''}
              style={{ backgroundColor: rowBgColor }}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((column) => (
                <td
                  key={`${keyExtractor(item, index)}-${column.key}`}
                  className="px-4 py-3 text-sm"
                  style={{ color: textPrimaryColor }}
                >
                  {column.render ? column.render(item, index) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;