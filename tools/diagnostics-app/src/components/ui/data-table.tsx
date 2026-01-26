import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  field: keyof T | string;
  headerName: string;
  flex?: number;
  type?: 'text' | 'number' | 'boolean' | 'dateTime';
  valueFormatter?: (params: { value: any; row: T }) => string;
  renderCell?: (params: { value: any; row: T }) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  rows: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  pageSizeOptions?: number[];
  initialSortField?: keyof T | string;
  initialSortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  initialSortField,
  initialSortDirection = 'desc',
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sortField, setSortField] = React.useState<keyof T | string | null>(initialSortField ?? null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(initialSortField ? initialSortDirection : null);

  const sortedRows = React.useMemo(() => {
    if (!sortField || !sortDirection) return rows;

    return [...rows].sort((a, b) => {
      const aValue = getNestedValue(a, sortField as string);
      const bValue = getNestedValue(b, sortField as string);

      // Handle null/undefined - push to end regardless of sort direction
      const aIsNull = aValue === null || aValue === undefined;
      const bIsNull = bValue === null || bValue === undefined;
      if (aIsNull && bIsNull) return 0;
      if (aIsNull) return 1;
      if (bIsNull) return -1;

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortField, sortDirection]);

  const paginatedRows = React.useMemo(() => {
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const handleSort = (field: keyof T | string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(0);
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setPage(0);
  };

  const getCellValue = (row: T, column: DataTableColumn<T>) => {
    const value = getNestedValue(row, column.field as string);

    if (column.renderCell) {
      return column.renderCell({ value, row });
    }

    if (column.valueFormatter) {
      return column.valueFormatter({ value, row });
    }

    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (column.type === 'dateTime' && value) {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      return new Date(value).toLocaleString();
    }

    if (value === null || value === undefined) {
      return '-';
    }

    return String(value);
  };

  const getCellAlignment = (column: DataTableColumn<T>) => {
    if (column.align) return column.align;
    if (column.type === 'number') return 'right';
    return 'left';
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={String(column.field)}
                  className={cn(
                    'cursor-pointer select-none whitespace-nowrap',
                    getCellAlignment(column) === 'right' && 'text-right',
                    getCellAlignment(column) === 'center' && 'text-center',
                    column.hideOnMobile && 'hidden md:table-cell'
                  )}
                  style={{ width: column.flex ? `${column.flex * 100}px` : undefined }}
                  onClick={() => handleSort(column.field)}>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      getCellAlignment(column) === 'right' && 'justify-end',
                      getCellAlignment(column) === 'center' && 'justify-center'
                    )}>
                    <span>{column.headerName}</span>
                    {sortField === column.field ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-30" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell
                      key={`${row.id}-${String(column.field)}`}
                      className={cn(
                        'align-top',
                        getCellAlignment(column) === 'right' && 'text-right',
                        getCellAlignment(column) === 'center' && 'text-center',
                        column.hideOnMobile && 'hidden md:table-cell'
                      )}>
                      {getCellValue(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sortedRows.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
