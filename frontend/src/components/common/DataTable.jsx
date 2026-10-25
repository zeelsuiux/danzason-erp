import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  pagination = null,
  onPageChange = () => {},
  onRowClick = null,
  actions = null,
  sortField,
  sortOrder,
  onSort,
}) {
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortOrder, setInternalSortOrder] = useState('asc');

  const activeSortKey = sortField !== undefined ? sortField : internalSortKey;
  const activeSortOrder = sortOrder !== undefined ? sortOrder : internalSortOrder;

  const handleSort = (col) => {
    if (col.sortable === false || (!col.key && !col.sortKey)) return;
    const key = col.sortKey || col.key;
    let nextOrder = 'asc';
    if (activeSortKey === key) {
      nextOrder = activeSortOrder === 'asc' ? 'desc' : 'asc';
    }
    if (sortField === undefined) {
      setInternalSortKey(key);
      setInternalSortOrder(nextOrder);
    }
    if (onSort) {
      onSort(key, nextOrder);
    }
  };

  const sortedData = useMemo(() => {
    if (!activeSortKey || !Array.isArray(data)) return data;
    const col = columns.find((c) => (c.sortKey || c.key) === activeSortKey);

    return [...data].sort((a, b) => {
      let valA, valB;
      if (col?.sortValue) {
        valA = col.sortValue(a);
        valB = col.sortValue(b);
      } else {
        const keyParts = String(activeSortKey).split('.');
        valA = keyParts.reduce((obj, k) => (obj != null ? obj[k] : undefined), a);
        valB = keyParts.reduce((obj, k) => (obj != null ? obj[k] : undefined), b);
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valA !== 'object') {
          comparison = numA - numB;
        } else {
          const dateA = Date.parse(valA);
          const dateB = Date.parse(valB);
          if (
            !isNaN(dateA) &&
            !isNaN(dateB) &&
            typeof valA === 'string' &&
            valA.length >= 8 &&
            isNaN(Number(valA))
          ) {
            comparison = dateA - dateB;
          } else {
            comparison = String(valA).localeCompare(String(valB), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          }
        }
      }
      return activeSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, activeSortKey, activeSortOrder, columns]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden flex flex-col transition-all">
      <div className="overflow-x-auto min-h-[250px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold text-[11px] tracking-wider uppercase">
              {columns.map((col, idx) => {
                const canSort = col.sortable !== false && (col.key || col.sortKey);
                const isSorted = activeSortKey && (col.sortKey || col.key) === activeSortKey;

                return (
                  <th
                    key={idx}
                    onClick={() => canSort && handleSort(col)}
                    className={`py-3.5 px-4 font-bold select-none ${col.className || col.headerClassName || ''} ${
                      canSort
                        ? 'cursor-pointer hover:bg-slate-100/80 hover:text-slate-900 group transition-colors'
                        : 'text-slate-600'
                    } ${isSorted ? 'text-brand font-extrabold bg-emerald-50/50' : 'text-slate-600'}`}
                    title={canSort ? `Sort by ${col.header}` : undefined}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {canSort && (
                        <span className="shrink-0 transition-opacity">
                          {isSorted ? (
                            activeSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 opacity-60 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions && <th className="py-3.5 px-4 text-right font-bold text-slate-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center">
                  <div className="inline-flex items-center gap-2.5 text-slate-500 font-medium text-xs">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2.5 border border-slate-100">
                      <Inbox className="w-6 h-6 stroke-[1.5] text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIdx) => (
                <tr
                  key={row._id || row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 text-xs sm:text-sm ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/90' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    const cellVal = col.key ? row?.[col.key] : undefined;
                    return (
                      <td key={colIdx} className={`py-3.5 px-4 text-slate-700 ${col.className || col.cellClassName || ''}`}>
                        {col.render
                          ? col.render(cellVal, row)
                          : (typeof cellVal === 'object' && cellVal !== null
                              ? (cellVal.name || cellVal.supplier_name || cellVal.product_name || cellVal.warehouse_name || cellVal.po_number || cellVal.invoice_number || '—')
                              : (cellVal ?? '—'))}
                      </td>
                    );
                  })}
                  {actions && (
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(pagination.page * pagination.limit, pagination.total || 0)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{pagination.total || 0}</span> entries
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => (pagination.onPageChange ? pagination.onPageChange(pagination.page - 1) : onPageChange(pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700 text-xs rounded-lg bg-white border border-slate-200 shadow-2xs font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => (pagination.onPageChange ? pagination.onPageChange(pagination.page + 1) : onPageChange(pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
