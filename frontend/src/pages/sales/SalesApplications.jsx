import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Download,
  Receipt,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { salesApi } from '../../services/procurementService';

export default function SalesApplications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Selected detail modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Load applications from API
  const loadApplications = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      // We call the order-request API (which is mapped to CRM and Sales)
      const res = await salesApi.getOrderRequests({
        page,
        limit: pagination.limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });

      const raw = res?.data || res?.order_requests || [];
      const items = Array.isArray(raw) ? raw.filter(Boolean) : (Array.isArray(raw?.requests) ? raw.requests.filter(Boolean) : []);
      const totalCount = res?.total || res?.pagination?.total || (Array.isArray(items) ? items.length : 0);

      setApplications(items);
      setPagination((prev) => ({
        ...prev,
        page,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / prev.limit)),
      }));
    } catch (err) {
      console.error('Failed to load CRM applications:', err);
      // Fallback attempt via sales applications endpoint
      try {
        const fallbackRes = await salesApi.getApplications({
          page,
          limit: pagination.limit,
        });
        const items = fallbackRes?.data || fallbackRes?.order_requests || [];
        setApplications(items);
      } catch (fErr) {
        setError(err.message || 'Failed to load order request applications');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplications(pagination.page);
  }, [pagination.page, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications(pagination.page);
  };

  // Quick Status Update
  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setStatusUpdating(true);
      await salesApi.updateApplicationStatus(appId, { status: newStatus });
      
      // Update locally
      setApplications((prev) =>
        prev.map((app) => (app._id === appId || app.id === appId ? { ...app, status: newStatus, order_status: newStatus } : app))
      );

      if (selectedApp && (selectedApp._id === appId || selectedApp.id === appId)) {
        setSelectedApp((prev) => ({ ...prev, status: newStatus, order_status: newStatus }));
      }
    } catch (err) {
      alert(`Error updating application status: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Convert Application to Sales Invoice
  const handleConvertToInvoice = (app) => {
    navigate('/sales/invoices', {
      state: {
        fromApplication: {
          appId: app._id || app.id,
          so_number: app.so_number,
          customer_id: app.customer_id?._id || app.customer_id,
          items: app.items,
          subtotal: app.subtotal,
          grand_total: app.grand_total,
          notes: `Created from CRM Application: ${app.so_number}`,
        },
      },
    });
  };

  // Convert Application to Sales Quotation
  const handleConvertToQuotation = (app) => {
    navigate('/sales/quotations?action=new', {
      state: {
        fromApplication: {
          customer_id: app.customer_id?._id || app.customer_id,
          items: app.items,
          notes: `Quotation for CRM Request ${app.so_number}`,
        },
      },
    });
  };

  // Filter items in memory for fast search & type filter
  const filteredApplications = useMemo(() => {
    if (!Array.isArray(applications)) return [];
    return applications.filter((app) => {
      if (!app) return false;
      const cust = app.customer_id || {};
      const custName = cust.customer_name || app.customer_name || app.user_name || '';
      const company = cust.company_name || '';
      const phone = cust.mobile || cust.phone || app.phone || '';
      const soNum = app.so_number || '';
      const notes = app.notes || '';
      const custType = cust.customer_type || 'B2B';

      const s = search.toLowerCase();
      const matchesSearch =
        !search ||
        custName.toLowerCase().includes(s) ||
        company.toLowerCase().includes(s) ||
        phone.includes(s) ||
        soNum.toLowerCase().includes(s) ||
        notes.toLowerCase().includes(s);

      const matchesType = typeFilter === 'all' || custType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [applications, search, typeFilter]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const list = Array.isArray(applications) ? applications.filter(Boolean) : [];
    const totalCount = pagination.total || list.length;
    const pendingCount = list.filter((a) => (a?.status || a?.order_status) === 'pending').length;
    const confirmedCount = list.filter((a) => ['confirmed', 'processing'].includes(a?.status || a?.order_status)).length;
    const totalVal = list.reduce((sum, a) => sum + (Number(a?.grand_total) || 0), 0);

    return {
      total: totalCount,
      pending: pendingCount,
      confirmed: confirmedCount,
      totalValue: totalVal,
    };
  }, [applications, pagination.total]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredApplications.length) return;
    const headers = ['Application #', 'Date', 'Customer Name', 'Phone', 'Customer Type', 'Items Count', 'Total Amount', 'Status'];
    const rows = filteredApplications.map((app) => [
      app?.so_number || app?.id || '',
      app?.order_date ? new Date(app.order_date).toLocaleDateString() : '',
      `"${app?.customer_id?.customer_name || app?.user_name || 'N/A'}"`,
      app?.customer_id?.mobile || app?.phone || '',
      app?.customer_id?.customer_type || 'B2B',
      app?.items?.length || 0,
      app?.grand_total || 0,
      app?.status || app?.order_status || 'Pending',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      key: 'so_number',
      label: 'Application / Req #',
      sortable: true,
      render: (val, row) => {
        const item = row || val || {};
        return (
          <div>
            <span className="font-mono font-bold text-slate-800 text-xs block">
              {item.so_number || `REQ-${String(item._id || item.id || '').slice(-6).toUpperCase()}`}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400 inline" />
              {item.order_date ? new Date(item.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'applicant',
      label: 'Applicant / Buyer',
      render: (val, row) => {
        const item = row || val || {};
        const cust = item.customer_id || {};
        const name = cust.customer_name || item.customer_name || item.user_name || 'Unknown Buyer';
        const company = cust.company_name;
        const type = cust.customer_type || 'B2B';

        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-xs">{name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  type === 'B2B'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {type}
              </span>
            </div>
            {company && <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{company}</p>}
          </div>
        );
      },
    },
    {
      key: 'contact',
      label: 'Contact & Location',
      render: (val, row) => {
        const item = row || val || {};
        const cust = item.customer_id || {};
        const phone = cust.mobile || cust.phone || item.phone;
        const city = cust.shipping_address?.city || cust.billing_address?.city || 'Gujarat';

        return (
          <div className="text-xs text-slate-600">
            {phone ? (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{phone}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic">No contact</span>
            )}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{city}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'items',
      label: 'Requested Items',
      render: (val, row) => {
        const item = row || val || {};
        const items = Array.isArray(item.items) ? item.items : (Array.isArray(val) ? val : []);
        const count = items.length;
        const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        const firstItem = items[0]?.product_name || 'Items';

        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              {count} {count === 1 ? 'Product' : 'Products'} ({totalQty} PCS)
            </span>
            <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={firstItem}>
              {firstItem} {count > 1 ? `+${count - 1} more` : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'grand_total',
      label: 'Total Value',
      sortable: true,
      render: (val, row) => {
        const item = row || val || {};
        const amount = Number(val !== undefined && typeof val === 'number' ? val : item.grand_total || 0);
        return (
          <div>
            <span className="font-bold text-slate-900 text-xs">
              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {item.advance_paid > 0 && (
              <p className="text-[10px] text-emerald-600 font-medium">
                Adv: ₹{Number(item.advance_paid).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Application Status',
      render: (val, row) => {
        const item = row || val || {};
        return <StatusBadge status={item.status || item.order_status || 'pending'} />;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (val, row) => {
        const item = row || val || {};
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => {
                setSelectedApp(item);
                setIsDetailModalOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
              title="View Application Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {(item.status === 'pending' || item.order_status === 'pending') && (
              <button
                onClick={() => handleUpdateStatus(item._id || item.id, 'confirmed')}
                disabled={statusUpdating}
                className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg transition-colors"
                title="Approve / Confirm Request"
              >
                Approve
              </button>
            )}

            <button
              onClick={() => handleConvertToInvoice(item)}
              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
              title="Convert to Sales Invoice"
            >
              <Receipt className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Sales Applications & Order Requests"
        subtitle="Manage external CRM inquiries, incoming wholesale buyer applications, and visitor order requests"
        breadcrumbs={[
          { label: 'Sales & Distribution', path: '/sales/quotations' },
          { label: 'Applications', active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Sync CRM</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Applications</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">From CRM API & Storefront</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{metrics.pending}</p>
            <p className="text-[11px] text-amber-700/70 mt-0.5">Awaiting Manager Approval</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Approved & Active</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">{metrics.confirmed}</p>
            <p className="text-[11px] text-blue-700/70 mt-0.5">Confirmed or In-Process</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline Value</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{metrics.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Active Demand Value</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ₹
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Applications' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'confirmed', label: 'Approved / Confirmed' },
              { id: 'processing', label: 'Processing' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Customer Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Buyer Types</option>
              <option value="B2B">B2B Wholesale</option>
              <option value="B2C">B2C Retail</option>
              <option value="Distributor">Distributor</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Applicant name, Company, Phone, Request #, or notes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredApplications}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onRowClick={(row) => {
            setSelectedApp(row);
            setIsDetailModalOpen(true);
          }}
        />
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Application Details – ${selectedApp.so_number || selectedApp.id}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Header info bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedApp.customer_id?.customer_name || selectedApp.user_name || 'Buyer Applicant'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedApp.customer_id?.company_name || 'Retail Inquiry'} •{' '}
                    <span className="font-semibold text-emerald-700">
                      {selectedApp.customer_id?.customer_type || 'B2B'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={selectedApp.status || selectedApp.order_status || 'pending'} />
                
                <div className="flex items-center gap-1.5">
                  {(selectedApp.status === 'pending' || selectedApp.order_status === 'pending') && (
                    <button
                      onClick={() => handleUpdateStatus(selectedApp._id || selectedApp.id, 'confirmed')}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                    >
                      Approve & Confirm
                    </button>
                  )}
                  {selectedApp.status !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedApp._id || selectedApp.id, 'cancelled')}
                      disabled={statusUpdating}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Applicant Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Contact Info</p>
                <p className="text-slate-800 flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedApp.customer_id?.mobile || selectedApp.customer_id?.phone || selectedApp.phone || 'N/A'}
                </p>
                <p className="text-slate-800 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedApp.customer_id?.email || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Business & Tax Details</p>
                <p className="text-slate-800">
                  <span className="text-slate-500">GSTIN:</span>{' '}
                  <span className="font-mono font-bold">{selectedApp.customer_id?.gstin || 'Unregistered'}</span>
                </p>
                <p className="text-slate-800">
                  <span className="text-slate-500">Customer Code:</span>{' '}
                  <span className="font-mono font-medium">{selectedApp.customer_id?.customer_code || 'NEW-LEAD'}</span>
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Delivery Address</p>
                <p className="text-slate-700 flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {selectedApp.customer_id?.shipping_address?.address_line1 || 'Primary Store Address'},{' '}
                    {selectedApp.customer_id?.shipping_address?.city || 'Ahmedabad'},{' '}
                    {selectedApp.customer_id?.shipping_address?.state || 'Gujarat'} -{' '}
                    {selectedApp.customer_id?.shipping_address?.pincode || '380001'}
                  </span>
                </p>
              </div>
            </div>

            {/* Requested Products Table */}
            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Requested Products ({selectedApp.items?.length || 0})
              </h5>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right">GST</th>
                      <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedApp.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.product_name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{item.sku || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {item.quantity} {item.uom || 'PCS'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(item.taxable_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.gst_rate}% (₹{Number(item.gst_amount || 0).toFixed(2)})
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          ₹{Number(item.total_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl">
                <p className="font-bold text-amber-800 text-[11px] uppercase tracking-wider mb-1">
                  Applicant Notes / Remarks
                </p>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  {selectedApp.notes || 'No custom instructions provided by applicant.'}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(selectedApp.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span className="font-mono">₹{Number(selectedApp.tax_total || 0).toFixed(2)}</span>
                </div>
                {selectedApp.shipping_charges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping Charges:</span>
                    <span className="font-mono">₹{Number(selectedApp.shipping_charges).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex justify-between text-slate-900 font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">₹{Number(selectedApp.grand_total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleConvertToQuotation(selectedApp);
                  }}
                  className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                >
                  Create Quotation
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleConvertToInvoice(selectedApp);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 transition-colors"
                >
                  <span>Convert to Sales Invoice</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
