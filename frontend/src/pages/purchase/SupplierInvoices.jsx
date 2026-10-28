import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Receipt,
  Building,
  AlertCircle,
  CreditCard,
  Calendar,
  Edit2,
  Clock,
  Check,
  Package,
  Search,
  Warehouse,
  Landmark,
  Printer,
  Download,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';
import bankAccountService from '../../services/bankAccountService';

export default function SupplierInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [purchaseTypeTab, setPurchaseTypeTab] = useState('all'); // 'all' | 'raw_material' | 'finished'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Purchase Bill Modal (Create & Edit)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editBill, setEditBill] = useState(null);

  // 1. Record Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer / NEFT',
    bank_account_id: '',
    reference_number: '',
    remarks: '',
  });

  // 2. Change Due Date Modal State
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [dueDateBill, setDueDateBill] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateSubmitting, setDueDateSubmitting] = useState(false);

  useEffect(() => {
    loadInvoices(pagination.page);
    loadBankAccounts();
  }, [pagination.page]);

  const loadBankAccounts = async () => {
    try {
      const res = await bankAccountService.getBankAccounts({ is_active: true });
      const list = Array.isArray(res.data) ? res.data : [];
      setBankAccounts(list);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    }
  };

  const loadInvoices = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getInvoices({ page, limit: 10 });
      const list = Array.isArray(res.data) ? res.data : [];
      setInvoices(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (bill) => {
    const bal = bill.balance_amount !== undefined ? bill.balance_amount : (bill.grand_total - (bill.paid_amount || 0));
    setPaymentBill(bill);
    const defaultBank = bankAccounts.find((b) => b.is_default_payment) || bankAccounts[0];
    setPaymentForm({
      amount: bal > 0 ? bal : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer / NEFT',
      bank_account_id: defaultBank?._id || '',
      reference_number: '',
      remarks: '',
    });
    setIsPaymentOpen(true);
  };

  // Submit Payment
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const selectedBank = bankAccounts.find((b) => b._id === paymentForm.bank_account_id);
      await ft.recordInvoicePayment(paymentBill._id, {
        ...paymentForm,
        bank_account_id: paymentForm.bank_account_id || undefined,
        bank_account_name: selectedBank?.account_name || undefined,
      });
      setIsPaymentOpen(false);
      setPaymentBill(null);
      loadInvoices(pagination.page);
      loadBankAccounts();
      alert('Payment recorded successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Open Due Date Modal
  const handleOpenDueDate = (bill) => {
    setDueDateBill(bill);
    setNewDueDate(bill.due_date ? new Date(bill.due_date).toISOString().split('T')[0] : '');
    setIsDueDateOpen(true);
  };

  // Submit Due Date Change
  const handleDueDateSubmit = async (e) => {
    e.preventDefault();
    if (!newDueDate) {
      alert('Please select a valid due date');
      return;
    }
    try {
      setDueDateSubmitting(true);
      await ft.updateInvoiceDueDate(dueDateBill._id, newDueDate);
      setIsDueDateOpen(false);
      setDueDateBill(null);
      loadInvoices(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to update due date');
    } finally {
      setDueDateSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (bill) => {
    setEditBill(bill);
    setIsEditOpen(true);
  };

  const columns = [
    {
      header: 'System Bill #',
      key: 'invoice_number',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm',
      render: (val, row) => (
        <div>
          <span>{val}</span>
          {row.is_service_bill ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-sans bg-amber-100 text-amber-800 border border-amber-300 font-bold block w-fit mt-1">
              Job Work Service
            </span>
          ) : row.purchase_type === 'raw_material' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-sans bg-blue-100 text-blue-800 border border-blue-300 font-bold block w-fit mt-1">
              Raw Material
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Vendor Bill #',
      key: 'vendor_bill_number',
      cellClassName: 'font-mono font-medium text-slate-700 text-xs',
    },
    {
      header: 'Challan #',
      key: 'challan_number',
      render: (val, row) => (
        <div>
          <span className="font-mono text-xs text-slate-800 font-semibold">{val || '—'}</span>
          {row.challan_date && (
            <span className="text-[10px] text-slate-400 block font-sans">
              {new Date(row.challan_date).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Bill Date',
      key: 'bill_date',
      render: (val) => <span className="text-xs text-slate-600">{new Date(val).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Due Date',
      key: 'due_date',
      render: (val, row) => {
        const bal = row.balance_amount !== undefined ? row.balance_amount : (row.grand_total - (row.paid_amount || 0));
        const isOverdue = val && new Date(val) < new Date() && bal > 0;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-medium ${
                isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}
            >
              {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDueDate(row);
              }}
              className="text-slate-400 hover:text-brand transition p-0.5 rounded"
              title="Change Due Date"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      header: 'Supplier',
      key: 'supplier_id',
      render: (sup) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand shrink-0" />
            {sup?.supplier_name || 'N/A'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{sup?.gstin || ''}</p>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      key: 'warehouse_id',
      render: (wh) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Warehouse className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>{wh?.warehouse_name || 'Central WH'}</span>
        </span>
      ),
    },
    {
      header: 'Grand Total',
      key: 'grand_total',
      cellClassName: 'font-semibold text-slate-900 font-mono text-sm',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Paid Amount',
      key: 'paid_amount',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-emerald-700">
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Balance Due',
      key: 'balance_amount',
      render: (val, row) => {
        const bal = val !== undefined ? val : ((row.grand_total || 0) - (row.paid_amount || 0));
        return (
          <span
            className={`font-mono text-sm font-bold ${
              bal > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            ₹{Number(bal || 0).toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Payment Status',
      key: 'payment_status',
      render: (val, row) => {
        const total = Number(row.grand_total || 0);
        const paid = Number(row.paid_amount || 0);
        const status = val || (paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid');
        const badgeClasses = {
          paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
          unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
        }[status] || 'bg-slate-100 text-slate-800 border-slate-200';

        const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

        return (
          <div className="space-y-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeClasses}`}>
              {status.replace('_', ' ')}
            </span>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${status === 'paid' ? 'bg-emerald-500' : status === 'partially_paid' ? 'bg-amber-500' : 'bg-slate-300'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">{percent}% Paid</span>
          </div>
        );
      },
    },
  ];

  // Purchase Tabs: All | Raw Material | Finished
  const nonJobWorkInvoices = invoices.filter(
    (row) => row.purchase_type !== 'manufacturing' && !row.is_service_bill
  );
  const rawMaterialInvoices = invoices.filter(
    (row) => row.purchase_type === 'raw_material'
  );
  const finishedInvoices = invoices.filter(
    (row) =>
      (!row.purchase_type || row.purchase_type === 'standard' || row.purchase_type === 'finished') &&
      !row.is_service_bill
  );

  const tabScopedInvoices =
    purchaseTypeTab === 'all'
      ? nonJobWorkInvoices
      : purchaseTypeTab === 'raw_material'
      ? rawMaterialInvoices
      : finishedInvoices;

  const filteredInvoices = tabScopedInvoices.filter((row) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchInv = row.invoice_number?.toLowerCase().includes(term);
    const matchVendorBill = row.vendor_bill_number?.toLowerCase().includes(term);
    const matchSuppInv = row.supplier_invoice_number?.toLowerCase().includes(term);
    const matchChallan = row.challan_number?.toLowerCase().includes(term);
    const matchSuppName = row.supplier_id?.supplier_name?.toLowerCase().includes(term);
    const matchSuppCode = row.supplier_id?.supplier_code?.toLowerCase().includes(term);
    const matchPo = row.po_id?.po_number?.toLowerCase().includes(term);
    const matchItems = row.items?.some(
      (it) => it.product_name?.toLowerCase().includes(term) || it.sku?.toLowerCase().includes(term) || it.description?.toLowerCase().includes(term)
    );
    return matchInv || matchVendorBill || matchSuppInv || matchChallan || matchSuppName || matchSuppCode || matchPo || matchItems;
  });

  const handlePrintBill = (bill) => {
    if (!bill) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print the purchase bill.');
      return;
    }
    const itemsHtml = (bill.items || []).map((it, idx) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;"><strong>${it.product_name || it.description || 'Item'}</strong></td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${it.sku || '—'}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${it.quantity || it.received_qty || 0} ${it.uom || 'PCS'}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">₹${Number(it.unit_rate || it.rate || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${it.gst_rate !== undefined ? it.gst_rate : 18}%</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">₹${Number(it.total_amount || ((it.quantity || 1) * (it.unit_rate || 0)) || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Bill Voucher - ${bill.invoice_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
          .totals-table { width: 280px; }
          .totals-table td { padding: 4px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">DANZA-SON ERP</div>
            <div style="color: #64748b;">Purchase Bill / Inward Voucher</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: bold;">Bill #${bill.invoice_number}</div>
            <div style="color: #64748b;">Date: ${new Date(bill.bill_date || bill.createdAt).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <strong>Supplier / Vendor:</strong><br>
            <span style="font-size: 13px; font-weight: bold;">${bill.supplier_id?.supplier_name || 'Vendor'}</span><br>
            GSTIN: ${bill.supplier_id?.gstin || 'Unregistered'}<br>
            Contact: ${bill.supplier_id?.mobile || bill.supplier_id?.phone || 'On file'}
          </div>
          <div class="card">
            <strong>Reference & Dispatch Details:</strong><br>
            <strong>Challan Number:</strong> ${bill.challan_number || '—'}<br>
            <strong>Challan Date:</strong> ${bill.challan_date ? new Date(bill.challan_date).toLocaleDateString('en-IN') : '—'}<br>
            <strong>Vendor Bill Ref:</strong> ${bill.vendor_bill_number || 'N/A'}<br>
            <strong>Destination Warehouse:</strong> ${bill.warehouse_id?.warehouse_name || 'Central Warehouse'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Item / Description</th>
              <th style="width: 70px;">SKU</th>
              <th style="width: 70px;">Qty</th>
              <th style="width: 80px;">Rate</th>
              <th style="width: 50px;">GST %</th>
              <th style="width: 90px; text-align: right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Taxable Amount:</td>
              <td style="text-align: right; font-weight: bold;">₹${Number(bill.taxable_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>CGST / SGST:</td>
              <td style="text-align: right;">₹${(Number(bill.cgst_total || 0) + Number(bill.sgst_total || 0)).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-top: 2px solid #0f172a; font-size: 13px;">
              <td><strong>Grand Total:</strong></td>
              <td style="text-align: right; font-weight: bold; color: #0f172a;">₹${Number(bill.grand_total || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Paid Amount:</td>
              <td style="text-align: right; color: #16a34a;">₹${Number(bill.paid_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="font-weight: bold; color: #dc2626;">
              <td>Balance Due:</td>
              <td style="text-align: right;">₹${Number(bill.balance_amount !== undefined ? bill.balance_amount : (bill.grand_total - (bill.paid_amount || 0))).toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
          <div>Warehouse Inward Seal & Signature</div>
          <div>Authorized Accounts Signatory</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      alert('No purchase bills to export.');
      return;
    }
    const headers = ['Invoice #', 'Vendor Bill #', 'Challan #', 'Challan Date', 'Supplier Name', 'Bill Date', 'Due Date', 'Total (INR)', 'Paid (INR)', 'Balance Due (INR)', 'Payment Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number || '',
      inv.vendor_bill_number || '',
      inv.challan_number || '',
      inv.challan_date ? new Date(inv.challan_date).toISOString().split('T')[0] : '',
      `"${(inv.supplier_id?.supplier_name || '').replace(/"/g, '""')}"`,
      inv.bill_date ? new Date(inv.bill_date).toISOString().split('T')[0] : '',
      inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : '',
      inv.grand_total || 0,
      inv.paid_amount || 0,
      inv.balance_amount !== undefined ? inv.balance_amount : ((inv.grand_total || 0) - (inv.paid_amount || 0)),
      inv.payment_status || 'unpaid',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `purchase_bills_${purchaseTypeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Purchase Invoices (Supplier Bills)"
        subtitle="Book vendor commercial invoices, record payments, update due dates, and manage vendor payables."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Bills' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition"
              title="Export Current Tab Bills to CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => navigate('/purchase-bills/create')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Bill</span>
            </button>
          </div>
        }
      />

      {/* Tabs: All | Raw Material | Finished */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setPurchaseTypeTab('all')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {nonJobWorkInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPurchaseTypeTab('raw_material')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'raw_material'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Raw Material</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'raw_material' ? 'bg-blue-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {rawMaterialInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPurchaseTypeTab('finished')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'finished'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Finished</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'finished' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {finishedInvoices.length}
          </span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => setSelectedBill(row)}
        actions={(row) => {
          const bal = row.balance_amount !== undefined ? row.balance_amount : ((row.grand_total || 0) - (row.paid_amount || 0));
          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Record Payment */}
              {bal > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPayment(row);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-1 shadow-xs"
                  title="Record Payment"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Record Payment
                </button>
              ) : (
                <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                  Paid
                </span>
              )}

              {/* Change Due Date */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDueDate(row);
                }}
                className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                title="Change Due Date"
              >
                <Calendar className="w-4 h-4" />
              </button>

              {/* Edit Bill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase-bills/edit/${row._id}`);
                }}
                className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                title="Edit Bill"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* View */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBill(row);
                }}
                className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                title="View Bill Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          );
        }}
      />

      {/* 1. RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Vendor Bill Payment"
        size="md"
      >
        {paymentBill && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            {/* Quick Bill Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Bill Number:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {paymentBill.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Vendor:</span>
                <span className="font-semibold text-slate-800">
                  {paymentBill.supplier_id?.supplier_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Grand Total</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(paymentBill.grand_total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Already Paid</span>
                  <span className="font-bold text-emerald-600">
                    ₹{Number(paymentBill.paid_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-600 block font-sans">Remaining Due</span>
                  <span className="font-bold text-rose-700">
                    ₹{Number(
                      paymentBill.balance_amount !== undefined
                        ? paymentBill.balance_amount
                        : (paymentBill.grand_total - (paymentBill.paid_amount || 0))
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {/* Paying Bank Account Selector Prompt */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>Paying Bank Account *</span>
                  </label>
                  {paymentForm.bank_account_id && (
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      Bal: ₹
                      {Number(
                        bankAccounts.find((b) => b._id === paymentForm.bank_account_id)?.current_balance || 0
                      ).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <select
                  required
                  value={paymentForm.bank_account_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 text-xs font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                >
                  <option value="">-- Select Paying Bank Account / Cash Vault --</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.account_name} ({acc.bank_name}) - A/c: {acc.account_number} [Bal: ₹{Number(acc.current_balance || 0).toLocaleString('en-IN')}]
                      {acc.is_default_payment ? ' ★ Primary Default' : ''}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-blue-800 flex items-center justify-between pt-0.5">
                  <span>This payment will be automatically debited from the chosen bank balance.</span>
                  <button
                    type="button"
                    onClick={() => navigate('/purchase/settings?tab=bank_accounts')}
                    className="text-blue-700 font-bold hover:underline shrink-0"
                  >
                    + Manage Banks
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Payment Amount <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-slate-500 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-brand"
                    placeholder="Enter amount to pay"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, payment_mode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                  >
                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                    <option value="Cheque / DD">Cheque / Demand Draft</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reference / Cheque / UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-99887766 or Cheque-54321"
                  value={paymentForm.reference_number}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, reference_number: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Optional remarks about this payment..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {paymentSubmitting ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 2. CHANGE DUE DATE MODAL */}
      <Modal
        isOpen={isDueDateOpen}
        onClose={() => setIsDueDateOpen(false)}
        title="Change Bill Due Date"
        size="sm"
      >
        {dueDateBill && (
          <form onSubmit={handleDueDateSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-slate-500">
                Bill #: <span className="font-mono font-bold text-slate-900">{dueDateBill.invoice_number}</span>
              </p>
              <p className="text-slate-500">
                Vendor: <span className="font-semibold text-slate-800">{dueDateBill.supplier_id?.supplier_name}</span>
              </p>
              <p className="text-slate-500">
                Current Due Date:{' '}
                <span className="font-medium text-slate-800">
                  {dueDateBill.due_date ? new Date(dueDateBill.due_date).toLocaleDateString('en-IN') : 'Not Set'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                New Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDueDateOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dueDateSubmitting}
                className="px-4 py-1.5 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 transition disabled:opacity-50"
              >
                {dueDateSubmitting ? 'Updating...' : 'Update Due Date'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bill Details Modal */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title={`Purchase Bill Details: ${selectedBill.invoice_number}`}
          size="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500 font-medium">Bill Number</p>
                <p className="font-mono font-bold text-slate-900">{selectedBill.invoice_number}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Vendor Ref #</p>
                <p className="font-mono text-slate-800">{selectedBill.vendor_bill_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Challan #</p>
                <p className="font-mono text-slate-800 font-semibold">{selectedBill.challan_number || '—'}</p>
                {selectedBill.challan_date && (
                  <p className="text-[10px] text-slate-400 font-sans">
                    {new Date(selectedBill.challan_date).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-500 font-medium">Bill Date</p>
                <p className="text-slate-800 font-semibold">
                  {new Date(selectedBill.bill_date).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Due Date</p>
                <p className="text-slate-800 font-semibold">
                  {selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString('en-IN') : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Destination WH</p>
                <p className="text-slate-800 font-bold flex items-center gap-1 text-[11px]">
                  <Warehouse className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>{selectedBill.warehouse_id?.warehouse_name || 'Central WH'}</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Vendor / Supplier
              </p>
              <p className="font-bold text-slate-900 text-sm">
                {selectedBill.supplier_id?.supplier_name || 'Vendor'}
              </p>
              <p className="text-xs font-mono text-slate-500">
                GSTIN: {selectedBill.supplier_id?.gstin || 'Unregistered'}
              </p>
            </div>

            {/* Billed Items Table */}
            {selectedBill.items && selectedBill.items.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Billed Items ({selectedBill.items.length})</span>
                  <span className="font-mono text-slate-400 font-normal">Line items inward</span>
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">Product / Description</th>
                        <th className="p-2 w-24 text-center">SKU</th>
                        <th className="p-2 w-16 text-center">Qty</th>
                        <th className="p-2 w-16 text-center">Unit</th>
                        <th className="p-2 w-20 text-right">Rate</th>
                        <th className="p-2 w-16 text-right">Disc</th>
                        <th className="p-2 w-16 text-center">GST %</th>
                        <th className="p-2 w-24 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {selectedBill.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-medium text-slate-900">
                            {it.product_id?.product_name || it.description || 'Material Item'}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                            {it.sku || it.product_id?.sku || '—'}
                          </td>
                          <td className="p-2 text-center font-bold font-mono text-slate-800">{it.quantity}</td>
                          <td className="p-2 text-center text-slate-600">{it.uom || 'PCS'}</td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            ₹{Number(it.unit_rate || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-mono text-rose-600">
                            {it.discount ? `₹${it.discount}` : '—'}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600">{it.gst_rate || 0}%</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            ₹{Number(it.total_amount || it.quantity * it.unit_rate || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visual Payment Progress */}
            {(() => {
              const total = Number(selectedBill.grand_total || 0);
              const paid = Number(selectedBill.paid_amount || 0);
              const bal = Number(
                selectedBill.balance_amount !== undefined
                  ? selectedBill.balance_amount
                  : total - paid
              );
              const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
              const status = selectedBill.payment_status || (paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid');

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-center">
                    <div>
                      <p className="text-xs text-slate-500 font-sans">Grand Total</p>
                      <p className="font-bold text-slate-900 text-base">₹{total.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 font-sans">Paid Amount</p>
                      <p className="font-bold text-emerald-700 text-base">₹{paid.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-rose-600 font-sans">Remaining Due</p>
                      <p className="font-bold text-rose-700 text-base">₹{bal.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-600">Payment Clearance Progress:</span>
                      <span className={status === 'paid' ? 'text-emerald-700 font-bold' : 'text-slate-800'}>
                        {pct}% Settled ({status.toUpperCase().replace('_', ' ')})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          status === 'paid'
                            ? 'bg-emerald-500'
                            : status === 'partially_paid'
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Payment History Ledger */}
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Payment History Ledger
                    </h5>
                    {selectedBill.payments && selectedBill.payments.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                            <tr>
                              <th className="p-2">Date</th>
                              <th className="p-2">Mode</th>
                              <th className="p-2">Reference / UTR</th>
                              <th className="p-2">Notes</th>
                              <th className="p-2 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {selectedBill.payments.map((p, pIdx) => (
                              <tr key={p._id || pIdx} className="hover:bg-slate-50/50">
                                <td className="p-2 font-mono text-slate-700">
                                  {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN')}
                                </td>
                                <td className="p-2 font-semibold text-slate-800">{p.payment_mode || 'Bank'}</td>
                                <td className="p-2 font-mono text-slate-600">{p.reference_number || '—'}</td>
                                <td className="p-2 text-slate-500">{p.remarks || 'Payment recorded'}</td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                  ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-400 italic text-center text-xs">
                        No payments recorded for this bill yet.
                      </div>
                    )}
                  </div>

                  {/* Consolidated Delivery Notes / GRNs if any */}
                  {selectedBill.grn_ids && selectedBill.grn_ids.length > 0 && (
                    <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200 text-xs">
                      <span className="font-bold text-blue-900 block mb-0.5">Linked Goods Receipts (GRNs):</span>
                      <p className="text-blue-800 font-mono text-[11px]">
                        {selectedBill.grn_ids.map((g) => g.grn_number || g._id || g).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handlePrintBill(selectedBill)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <div className="flex items-center gap-2">
                {((selectedBill.balance_amount !== undefined ? selectedBill.balance_amount : (selectedBill.grand_total - (selectedBill.paid_amount || 0))) > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedBill;
                      setSelectedBill(null);
                      handleOpenPayment(b);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
