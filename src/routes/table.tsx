import React from 'react'
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProtectedRoute from '../components/ProtectedRoute'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  sortingFns,
  useReactTable,
} from '@tanstack/react-table'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'

import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingFn,
} from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface DummyJSONResponse {
  users: Person[];
  total: number;
  skip: number;
  limit: number;
}

interface TableSearchParams {
  globalFilter?: string;
  page?: number;
  pageSize?: number;
  sorting?: string;
  columnFilters?: string;
}

export const Route = createFileRoute('/table')({
  component: () => (
    <ProtectedRoute>
      <TableDemo />
    </ProtectedRoute>
  ),
  validateSearch: (search: Record<string, unknown>): TableSearchParams => {
    return {
      globalFilter: search.globalFilter as string | undefined,
      page: search.page ? Number(search.page) : undefined,
      pageSize: search.pageSize ? Number(search.pageSize) : undefined,
      sorting: search.sorting as string | undefined,
      columnFilters: search.columnFilters as string | undefined,
    }
  },
})

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({
    itemRank,
  })

  return itemRank.passed
}

const fuzzySort: SortingFn<any> = (rowA, rowB, columnId) => {
  let dir = 0

  if (rowA.columnFiltersMeta[columnId]) {
    dir = compareItems(
      rowA.columnFiltersMeta[columnId]?.itemRank!,
      rowB.columnFiltersMeta[columnId]?.itemRank!,
    )
  }

  return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir
}

function TableDemo() {
  const {
    globalFilter: initialGlobalFilter = '',
    page: initialPage,
    pageSize: initialPageSize,
    sorting: initialSortingStr,
    columnFilters: initialColumnFiltersStr
  } = useSearch({ from: '/table' })

  const navigate = useNavigate();

  const initialSorting = initialSortingStr ? JSON.parse(initialSortingStr) : [];
  const initialColumnFilters = initialColumnFiltersStr ? JSON.parse(initialColumnFiltersStr) : [];

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialColumnFilters,
  )
  const [globalFilter, setGlobalFilter] = React.useState(initialGlobalFilter)
  const [pagination, setPagination] = React.useState({
    pageIndex: initialPage ? initialPage - 1 : 0,
    pageSize: initialPageSize || 10,
  });
  const [sorting, setSorting] = React.useState(initialSorting);

  // Combine globalFilter and columnFilters for API search
  const searchQuery = React.useMemo(() => {
    const filters = columnFilters.map(filter => filter.value).filter(Boolean);
    if (globalFilter) {
      filters.push(globalFilter);
    }
    return filters.join(' ').trim();
  }, [globalFilter, columnFilters]);

  // Debug API requests
  React.useEffect(() => {
    console.log('Search Query:', searchQuery);
    console.log('Pagination:', pagination);
    console.log('API URL:', `https://dummyjson.com/users${searchQuery ? '/search' : ''}?limit=${pagination.pageSize}&skip=${pagination.pageIndex * pagination.pageSize}`);
  }, [searchQuery, pagination]);

  const { data, isLoading, error, refetch } = useQuery<DummyJSONResponse>({
    queryKey: ['people', searchQuery, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pagination.pageSize.toString(),
        skip: (pagination.pageIndex * pagination.pageSize).toString(),
      });
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      const url = `https://dummyjson.com/users${searchQuery ? '/search' : ''}`;
      console.log('Fetching:', `${url}?${params.toString()}`);
      const response = await axios.get<DummyJSONResponse>(url, { params });
      return response.data;
    },
    initialData: { users: [], total: 0, skip: 0, limit: 0 },
  })

  const columns = React.useMemo<ColumnDef<Person, any>[]>(
    () => [
      {
        accessorKey: 'id',
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'firstName',
        cell: (info) => info.getValue(),
        filterFn: 'includesStringSensitive',
      },
      {
        accessorKey: 'lastName',
        id: 'lastName',
        cell: (info) => info.getValue(),
        header: () => <span>Last Name</span>,
        filterFn: 'includesString',
      },
      {
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        id: 'fullName',
        header: 'Full Name',
        cell: (info) => info.getValue(),
        filterFn: 'fuzzy',
        sortingFn: fuzzySort,
      },
      {
        accessorKey: 'email',
        cell: (info) => info.getValue(),
        header: () => <span>Email</span>,
        filterFn: 'includesString',
      },
    ],
    [],
  )

  const updateSearchParams = React.useCallback(() => {
    const searchParams: TableSearchParams = {};

    if (globalFilter) {
      searchParams.globalFilter = globalFilter;
    }

    if (pagination.pageIndex > 0) {
      searchParams.page = pagination.pageIndex + 1;
    }

    if (pagination.pageSize !== 10) {
      searchParams.pageSize = pagination.pageSize;
    }

    if (sorting.length > 0) {
      searchParams.sorting = JSON.stringify(sorting);
    }

    if (columnFilters.length > 0) {
      searchParams.columnFilters = JSON.stringify(columnFilters);
    }

    console.log('Updating URL with searchParams:', searchParams);
    navigate({
      search: searchParams as any,
      replace: true,
    });
  }, [globalFilter, pagination, sorting, columnFilters, navigate]);

  React.useEffect(() => {
    updateSearchParams();
  }, [globalFilter, pagination, sorting, columnFilters, updateSearchParams]);

  const table = useReactTable({
    data: data.users,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      columnFilters,
      globalFilter,
      pagination,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    globalFilterFn: 'fuzzy',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualFiltering: true,
    manualPagination: true,
    pageCount: Math.ceil(data.total / pagination.pageSize),
    debugTable: true,
    debugHeaders: true,
    debugColumns: false,
  })

  React.useEffect(() => {
    if (table.getState().columnFilters[0]?.id === 'fullName') {
      if (table.getState().sorting[0]?.id !== 'fullName') {
        table.setSorting([{ id: 'fullName', desc: false }])
      }
    }
  }, [table.getState().columnFilters[0]?.id])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {isLoading && (
        <div className="text-center text-gray-400 mb-4">Loading...</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500 text-white rounded-md">
          Error: {error.message}
          <button
            onClick={() => refetch()}
            className="ml-4 px-2 py-1 bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && data.users.length === 0 && (
        <div className="text-center text-gray-400 mb-4">No users found.</div>
      )}
      {!isLoading && !error && (
        <>
          <div>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={(value) => setGlobalFilter(String(value))}
              className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Search all columns..."
            />
          </div>
          <div className="h-4" />
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-gray-200">
              <thead className="bg-gray-800 text-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-4 py-3 text-left"
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none hover:text-blue-400 transition-colors'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                          {header.column.getCanFilter() ? (
                            <div className="mt-2">
                              <Filter column={header.column} />
                            </div>
                          ) : null}
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
              </thead>
              <tbody className="divide-y divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-800 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div className="h-4" />
          <div className="flex flex-wrap items-center gap-2 text-gray-200">
            <button
              className="px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
            <button
              className="px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </button>
            <button
              className="px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </button>
            <button
              className="px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </button>
            <span className="flex items-center gap-1">
              <div>Page</div>
              <strong>
                {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              | Go to page:
              <input
                type="number"
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0
                  table.setPageIndex(page)
                }}
                className="w-16 px-2 py-1 bg-gray-800 rounded-md border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="px-2 py-1 bg-gray-800 rounded-md border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 text-gray-400">
            {data.total} Total Rows
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Filter({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue()

  return (
    <DebouncedInput
      type="text"
      value={(columnFilterValue ?? '') as string}
      onChange={(value) => column.setFilterValue(value)}
      placeholder={`Search ${column.id}...`}
      className="w-full px-2 py-1 bg-gray-700 text-white rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
    />
  )
}

function DebouncedInput({
                          value: initialValue,
                          onChange,
                          debounce = 500,
                          ...props
                        }: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounce])

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}