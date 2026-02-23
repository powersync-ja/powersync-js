import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  searchable?: boolean;
  searchPlaceholder?: string;
  resizableColumns?: boolean;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function toColumnDefs<T extends { id: string | number }>(columns: DataTableColumn<T>[]): ColumnDef<T, any>[] {
  return columns.map((col): ColumnDef<T, any> => {
    const field = String(col.field);
    const align = col.align ?? (col.type === 'number' ? 'right' : 'left');

    return {
      id: field,
      accessorFn: (row) => getNestedValue(row, field),
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <div
            className={cn(
              'flex items-center gap-1 cursor-pointer select-none',
              align === 'right' && 'justify-end',
              align === 'center' && 'justify-center'
            )}
            onClick={column.getToggleSortingHandler()}>
            <span className="truncate">{col.headerName}</span>
            {sorted === 'asc' ? (
              <ArrowUp className="h-4 w-4 shrink-0" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="h-4 w-4 shrink-0" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-30 shrink-0" />
            )}
          </div>
        );
      },
      cell: ({ getValue, row }) => {
        const value = getValue();
        const original = row.original;

        if (col.renderCell) {
          return col.renderCell({ value, row: original });
        }
        if (col.valueFormatter) {
          return col.valueFormatter({ value, row: original });
        }
        if (col.type === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        if (col.type === 'dateTime' && value) {
          return value instanceof Date ? value.toLocaleString() : new Date(value as string).toLocaleString();
        }
        if (value === null || value === undefined) {
          return '-';
        }
        return String(value);
      },
      size: (col.flex ?? 1) * 150,
      minSize: 50,
      meta: { align, hideOnMobile: col.hideOnMobile }
    };
  });
}

export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  initialSortField,
  initialSortDirection = 'desc',
  emptyMessage = 'No data available',
  searchable = true,
  searchPlaceholder = 'Search...',
  resizableColumns = true
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    initialSortField ? [{ id: String(initialSortField), desc: initialSortDirection === 'desc' }] : []
  );
  const [globalFilter, setGlobalFilter] = React.useState('');

  const tanstackColumns = React.useMemo(() => toColumnDefs(columns), [columns]);

  const table = useReactTable({
    data: rows,
    columns: tanstackColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableSortingRemoval: true,
    initialState: {
      pagination: { pageSize: initialPageSize }
    }
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();

  return (
    <div className="w-full min-w-0 space-y-4">
      {searchable && (
        <div className="flex items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border min-w-0 max-w-full">
        <div className="overflow-x-auto">
          <Table
            style={{
              width: `max(${table.getTotalSize()}px, 100%)`,
              tableLayout: 'fixed'
            }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | { align?: string; hideOnMobile?: boolean }
                      | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'relative whitespace-nowrap overflow-hidden group',
                          meta?.align === 'right' && 'text-right',
                          meta?.align === 'center' && 'text-center',
                          meta?.hideOnMobile && 'hidden md:table-cell'
                        )}
                        style={{ width: header.getSize() }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {resizableColumns && (
                          <div
                            onDoubleClick={() => header.column.resetSize()}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none bg-border',
                              'hover:bg-foreground',
                              header.column.getIsResizing() && 'bg-foreground'
                            )}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tanstackColumns.length} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | { align?: string; hideOnMobile?: boolean }
                        | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'align-top overflow-hidden',
                            meta?.align === 'right' && 'text-right',
                            meta?.align === 'center' && 'text-center',
                            meta?.hideOnMobile && 'hidden md:table-cell'
                          )}
                          style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredRowCount > 0 && (
        <div className="flex flex-shrink-0 items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(val) => table.setPageSize(Number(val))}>
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
              {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, filteredRowCount)} of{' '}
              {filteredRowCount}
              {globalFilter && filteredRowCount !== rows.length && (
                <span className="ml-1">({rows.length} total)</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(totalPages - 1)}
                disabled={!table.getCanNextPage()}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
