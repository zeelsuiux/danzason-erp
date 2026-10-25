import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  PackageX,
  PackageCheck,
  CreditCard,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { salesApi } from '../../services/procurementService';

export default function SalesReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalReturns: 0,
    totalCredit: 0,
    restockedCount: 0,
    damagedCount: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [returnItems, setReturnItems] = useState([]);

  useEffect(() => {
    loadReturns(pagination.page);
  }, [pagination.page, statusFilter]);

  const loadReturns = async (page = 1) => {
    try {
      setLoading(true);
      const res = await salesApi.getSalesReturns({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setReturns(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
        if (res.meta.stats) {
          setStats(res.meta.stats);
        }
      }
    } catch (err) {
      console.error('Error loading sales returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setErrorMessage('');
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setReturnItems([]);
    setRemarks('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setIsCreateOpen(true);

    try {
      setLoadingInvoices(true);
      const res = await salesApi.getInvoices({ limit: 100 });
      const list = Array.isArray(res.data) ? res.data : [];
      setInvoices(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setErrorMessage('');
    const inv = invoices.find((i) => i._id === invoiceId);
    setSelectedInvoice(inv || null);

    if (inv && Array.isArray(inv.items)) {
      const itemsList = inv.items.map((it) => {
        const qty = Number(it.quantity || 1);
        const rate = Number(it.unit_price || 0);
        const gstRate = Number(it.gst_rate !== undefined ? it.gst_rate : 18);
        const taxable = Math.round(qty * rate);
        const gstAmt = Math.round((taxable * gstRate) / 100);

        return {
          product_id: it.product_id?._id || it.product_id,
          product_name: it.product_name || 'Apparel Item',
          invoiced_qty: qty,
          quantity: qty, // Default full return or user adjusts
          unit_price: rate,
          gst_rate: gstRate,
          taxable_amount: taxable,
          gst_amount: gstAmt,
          total_amount: taxable + gstAmt,
          condition: 'good', // 'good' = Restocks stock, 'damaged' = Does NOT restock
          reason: '',
          included: true,
        };
      });
      setReturnItems(itemsList);
    } else {
      setReturnItems([]);
    }
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...returnItems];
    updated[index][field] = value;

    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const qty = Number(updated[index].quantity || 0);
      const rate = Number(updated[index].unit_price || 0);
      const gst = Number(updated[index].gst_rate || 0);
      const taxable = Math.round(qty * rate);
      const gstAmt = Math.round((taxable * gst) / 100);
      updated[index].taxable_amount = taxable;
      updated[index].gst_amount = gstAmt;
      updated[index].total_amount = taxable + gstAmt;
    }

    setReturnItems(updated);
  };

  const handleToggleItemIncluded = (index) => {
    const updated = [...returnItems];
    updated[index].included = !updated[index].included;
    setReturnItems(updated);
  };

  const calculateReturnTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    returnItems.forEach((it) => {
      if (it.included) {
        subtotal += Number(it.taxable_amount || 0);
        taxTotal += Number(it.gst_amount || 0);
      }
    });
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedInvoiceId) {
      setErrorMessage('Please select a valid Sales Invoice.');
      return;
    }

    const activeItems = returnItems.filter((it) => it.included && Number(it.quantity) > 0);
    if (activeItems.length === 0) {
      setErrorMessage('Please select at least one item with a return quantity greater than 0.');
      return;
    }

    // Check quantity bounds
    for (const it of activeItems) {
      if (Number(it.quantity) > Number(it.invoiced_qty)) {
        setErrorMessage(
          `Return quantity for "${it.product_name}" cannot exceed the invoiced quantity (${it.invoiced_qty}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        invoice_id: selectedInvoiceId,
        customer_id: selectedInvoice.customer_id?._id || selectedInvoice.customer_id,
        return_date: returnDate,
        remarks: remarks.trim(),
        items: activeItems.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          gst_rate: Number(it.gst_rate),
          condition: it.condition,
          reason: it.reason.trim(),
        })),
      };

      await salesApi.createSalesReturn(payload);
      setIsCreateOpen(false);
      loadReturns(pagination.page);
      alert('🎉 Sales Return recorded successfully!\nSaleable inventory has been restocked and customer financial credit has been applied.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process sales return.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Return #',
      key: 'return_number',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm',
    },
    {
      header: 'Original Invoice #',
      key: 'invoice_id',
      render: (inv) => (
        <span className="font-mono text-xs font-semibold text-brand">
          {inv?.invoice_number || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Customer',
      key: 'customer_id',
      render: (cust) => (
        <div>
          <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {cust?.customer_name || 'Customer'}
          </p>
          <span className="text-[10px] font-mono text-slate-400">
            {cust?.customer_type || 'B2B'}
          </span>
        </div>
      ),
    },
    {
      header: 'Return Date',
      key: 'return_date',
      render: (val) => (
        <span className="text-xs text-slate-600">
          {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      header: 'Returned Items',
      key: 'items',
      render: (items) => {
        const good = (items || []).filter((i) => i.condition === 'good').length;
        const damaged = (items || []).filter((i) => i.condition === 'damaged').length;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            {good > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {good} Restocked
              </span>
            )}
            {damaged > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {damaged} Damaged
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Credit Total',
      key: 'grand_total',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm text-right',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Sales Returns & Credit Notes"
        subtitle="Manage customer product returns, inspect returned item condition, auto-restock saleable units, and issue credit adjustments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Returns' },
        ]}
        actions={
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Sales Return
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Returns
            </span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {stats.totalReturns}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Restocked Units
            </span>
            <span className="text-xl font-bold font-mono text-emerald-700">
              {stats.restockedCount}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Damaged / Scrap
            </span>
            <span className="text-xl font-bold font-mono text-rose-700">
              {stats.damagedCount}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Credit Issued
            </span>
            <span className="text-xl font-bold font-mono text-brand">
              ₹{Number(stats.totalCredit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadReturns(1)}
            placeholder="Search return # or notes..."
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Returns Table */}
      <DataTable
        columns={columns}
        data={returns}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => setSelectedReturn(row)}
        actions={(row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReturn(row);
            }}
            className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
            title="View Return Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      />

      {/* CREATE SALES RETURN MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record New Sales Return & Credit Note"
        size="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans text-slate-800">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Business Rules Banner */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
            <p className="font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              ERP Return & Restock Business Logic:
            </p>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-0.5 pl-1">
              <li>
                Items marked as <span className="font-bold underline">Good Condition</span> will automatically increment saleable stock in inventory.
              </li>
              <li>
                Items marked as <span className="font-bold underline text-rose-700">Damaged</span> will NOT be added to active inventory.
              </li>
              <li>
                Financial credit (Grand Total) will automatically reduce customer pending balance and invoice balance.
              </li>
            </ul>
          </div>

          {/* Invoice Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Sales Invoice <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedInvoiceId}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
              >
                <option value="">-- Choose Sales Invoice --</option>
                {invoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoice_number} — {inv.customer_id?.customer_name || 'Customer'} (₹{Number(inv.grand_total || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Return Date</label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-semibold"
              />
            </div>
          </div>

          {/* Selected Invoice Details Card */}
          {selectedInvoice && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Customer</span>
                <span className="font-bold text-slate-800">
                  {selectedInvoice.customer_id?.customer_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Customer Type</span>
                <span className="font-semibold text-slate-700">
                  {selectedInvoice.customer_id?.customer_type || 'B2B'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Invoice Total</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(selectedInvoice.grand_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Current Balance</span>
                <span className="font-mono font-bold text-rose-600">
                  ₹{Number(selectedInvoice.balance_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Return Line Items */}
          {returnItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Select Items to Return & Inspect Condition
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Inc</th>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 w-20 text-center">Inv Qty</th>
                      <th className="p-2.5 w-24 text-center">Return Qty</th>
                      <th className="p-2.5 w-24 text-right">Price (₹)</th>
                      <th className="p-2.5 w-32">Condition</th>
                      <th className="p-2.5 w-28 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((it, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/50 ${
                          !it.included ? 'opacity-40 bg-slate-50' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={it.included}
                            onChange={() => handleToggleItemIncluded(idx)}
                            className="rounded text-brand focus:ring-brand"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          <div>
                            <span>{it.product_name}</span>
                            {it.included && (
                              <input
                                type="text"
                                placeholder="Reason / defect note..."
                                value={it.reason}
                                onChange={(e) =>
                                  handleItemFieldChange(idx, 'reason', e.target.value)
                                }
                                className="w-full mt-1 px-2 py-0.5 text-[11px] border border-slate-200 rounded outline-none focus:border-brand font-normal"
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          {it.invoiced_qty}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max={it.invoiced_qty}
                            disabled={!it.included}
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemFieldChange(idx, 'quantity', e.target.value)
                            }
                            className="w-18 px-2 py-1 border border-slate-200 rounded text-center font-mono font-bold focus:border-brand outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-700">
                          ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5">
                          <select
                            disabled={!it.included}
                            value={it.condition}
                            onChange={(e) =>
                              handleItemFieldChange(idx, 'condition', e.target.value)
                            }
                            className={`w-full px-2 py-1 rounded text-[11px] font-bold border outline-none ${
                              it.condition === 'good'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="good">✓ Good (Restock)</option>
                            <option value="damaged">✗ Damaged (Scrap)</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Return Remarks / Notes</label>
            <textarea
              rows="2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Returned due to sizing defect / Customer requested replacement credit..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-brand"
            />
          </div>

          {/* Live Calculation & Submit Action */}
          {(() => {
            const { subtotal, taxTotal, grandTotal } = calculateReturnTotals();
            return (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 font-sans block text-[10px]">Taxable Credit:</span>
                    <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block text-[10px]">GST Adjustment:</span>
                    <span className="font-bold text-slate-800">₹{taxTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pl-3 border-l border-slate-200">
                    <span className="text-brand font-sans block text-[10px] font-bold">Grand Credit Total:</span>
                    <span className="font-black text-brand text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || returnItems.filter((i) => i.included).length === 0}
                    className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-600 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{submitting ? 'Processing Return...' : 'Record Sales Return & Issue Credit'}</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* VIEW RETURN DETAILS MODAL */}
      {selectedReturn && (
        <Modal
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          title={`Sales Return Details: ${selectedReturn.return_number}`}
          size="lg"
        >
          <div className="space-y-4 text-xs font-sans text-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Return Number</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {selectedReturn.return_number}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Invoice Ref</p>
                <p className="font-mono font-bold text-brand mt-0.5">
                  {selectedReturn.invoice_id?.invoice_number || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Customer</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedReturn.customer_id?.customer_name || 'Customer'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Return Date</p>
                <p className="font-medium text-slate-700 mt-0.5">
                  {new Date(selectedReturn.return_date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            {/* Financial Credit summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-slate-200 text-center font-mono">
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block font-sans">Taxable Subtotal</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(selectedReturn.subtotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-400 block font-sans">Tax Adjustment</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(selectedReturn.tax_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block font-sans font-bold">
                  Total Financial Credit
                </span>
                <span className="font-black text-emerald-800 text-base">
                  ₹{Number(selectedReturn.grand_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Return items table */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Returned Items & Restock Status
              </h5>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 w-20 text-center">Returned Qty</th>
                      <th className="p-2.5 w-24 text-right">Unit Rate</th>
                      <th className="p-2.5 w-32 text-center">Condition</th>
                      <th className="p-2.5 w-28 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedReturn.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {it.product_name}
                          {it.reason && (
                            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                              Note: {it.reason}
                            </p>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center">
                          {it.condition === 'good' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Good (Restocked)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ✗ Damaged (Scrap)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedReturn.remarks && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Remarks / Reason:</span>
                <p className="text-slate-600">{selectedReturn.remarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
