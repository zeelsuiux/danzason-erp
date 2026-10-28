import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building,
  CreditCard,
  AlertCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  Check,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';
import { salesApi } from '../../services/procurementService';

export default function CustomersDirectory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('B2B'); // 'B2B' | 'B2C'
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeCounts, setTypeCounts] = useState({ B2B: 0, B2C: 0, ALL: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const initialForm = {
    customer_name: '',
    company_name: '',
    contact_person: '',
    reference: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    customer_type: 'B2B',
    categories: ['General'],
    credit_limit: 100000,
    credit_period_days: 30,
    payment_terms: 'Net 30 Days',
    billing_address: {
      address_line1: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
    shipping_address: {
      address_line1: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadCustomers(pagination.page);
  }, [pagination.page, search, activeTab]);

  const loadCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await salesApi.getCustomers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        type: activeTab,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setCustomers(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
        if (res.meta.typeCounts) {
          setTypeCounts(res.meta.typeCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      ...initialForm,
      customer_type: activeTab,
      credit_limit: activeTab === 'B2B' ? 100000 : 0,
      payment_terms: activeTab === 'B2B' ? 'Net 30 Days' : 'Immediate / Cash',
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      customer_name: cust.customer_name || '',
      company_name: cust.company_name || '',
      contact_person: cust.contact_person || '',
      reference: cust.reference || '',
      email: cust.email || '',
      mobile: cust.mobile || '',
      gstin: cust.gstin || '',
      pan: cust.pan || '',
      customer_type: cust.customer_type || 'B2B',
      categories: cust.categories && cust.categories.length > 0 ? cust.categories : ['General'],
      credit_limit: cust.credit_limit || 100000,
      credit_period_days: cust.credit_period_days || 30,
      payment_terms: cust.payment_terms || 'Net 30 Days',
      billing_address: {
        address_line1: cust.billing_address?.address_line1 || '',
        city: cust.billing_address?.city || '',
        state: cust.billing_address?.state || 'Gujarat',
        pincode: cust.billing_address?.pincode || '',
      },
      shipping_address: {
        address_line1: cust.shipping_address?.address_line1 || '',
        city: cust.shipping_address?.city || '',
        state: cust.shipping_address?.state || 'Gujarat',
        pincode: cust.shipping_address?.pincode || '',
      },
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleDelete = async (cust) => {
    if (!window.confirm(`Are you sure you want to delete customer "${cust.customer_name}"?`)) {
      return;
    }
    try {
      await salesApi.deleteCustomer(cust._id);
      loadCustomers(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      if (editingCustomer) {
        await salesApi.updateCustomer(editingCustomer._id, formData);
      } else {
        await salesApi.createCustomer(formData);
      }
      setIsModalOpen(false);
      loadCustomers(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const b2bColumns = [
    {
      header: 'Business / Company',
      key: 'company_name',
      render: (val, row) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => navigate(`/sales/customers/${row._id}`)}
            className="font-bold text-slate-900 text-sm hover:text-brand transition text-left block"
            title="Open Customer 360° Profile"
          >
            {val || row.customer_name}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium text-[11px]">
              {row.customer_code}
            </span>
            {val && <span className="font-sans text-slate-500">Contact: {row.contact_person || row.customer_name}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'mobile',
      render: (val, row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          {val && (
            <p className="font-mono flex items-center gap-1 font-semibold text-slate-800">
              <Phone className="w-3 h-3 text-slate-400" /> {val}
            </p>
          )}
          {row.email && (
            <p className="flex items-center gap-1 text-slate-500 truncate max-w-[180px]">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Tax Identifiers',
      key: 'gstin',
      render: (val, row) => (
        <div className="text-xs font-mono">
          {val ? (
            <p className="font-bold text-slate-800">GST: {val}</p>
          ) : (
            <p className="text-slate-400">GST: Unregistered</p>
          )}
          {row.pan && <p className="text-slate-500 mt-0.5">PAN: {row.pan}</p>}
        </div>
      ),
    },
    {
      header: 'Credit & Terms',
      key: 'credit_limit',
      render: (val, row) => (
        <div>
          <p className="text-xs font-mono font-bold text-slate-900">
            Limit: ₹{(val || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{row.payment_terms || 'Net 30 Days'}</p>
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'billing_address',
      render: (addr) => (
        <div>
          <p className="text-xs font-medium text-slate-800">{addr?.city || '—'}</p>
          <p className="text-[11px] text-slate-400">{addr?.state || 'Gujarat'}</p>
        </div>
      ),
    },
    {
      header: 'Reference',
      key: 'reference',
      render: (val) => (
        <span className="text-xs text-slate-700 font-medium">
          {val || <span className="text-slate-400 italic">None</span>}
        </span>
      ),
    },
    {
      header: 'Outstanding Balance',
      key: 'pending_balance',
      render: (val) => (
        <span
          className={`font-mono text-sm font-bold ${
            val > 0 ? 'text-rose-600' : 'text-emerald-700'
          }`}
        >
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const b2cColumns = [
    {
      header: 'Customer Name',
      key: 'customer_name',
      render: (val, row) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => navigate(`/sales/customers/${row._id}`)}
            className="font-bold text-slate-900 text-sm hover:text-brand transition text-left block"
            title="Open Customer Profile"
          >
            {val}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium text-[11px]">
              {row.customer_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile Number',
      key: 'mobile',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1">
          <Phone className="w-3 h-3 text-slate-400" /> {val || '—'}
        </span>
      ),
    },
    {
      header: 'Email (Optional)',
      key: 'email',
      render: (val) => (
        <span className="text-xs text-slate-600 truncate max-w-[180px] block">
          {val || <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      header: 'City & State',
      key: 'billing_address',
      render: (addr) => (
        <div>
          <p className="text-xs font-medium text-slate-800">{addr?.city || '—'}</p>
          <p className="text-[11px] text-slate-400">{addr?.state || 'Gujarat'}</p>
        </div>
      ),
    },
    {
      header: 'Reference',
      key: 'reference',
      render: (val) => (
        <span className="text-xs text-slate-700 font-medium">
          {val || <span className="text-slate-400 italic">None</span>}
        </span>
      ),
    },
    {
      header: 'Outstanding Balance',
      key: 'pending_balance',
      render: (val) => (
        <span
          className={`font-mono text-sm font-bold ${
            val > 0 ? 'text-rose-600' : 'text-emerald-700'
          }`}
        >
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Customers"
        subtitle="Manage B2B commercial accounts and B2C retail consumers with dedicated workflows."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/customers' },
          { label: 'Customers' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add {activeTab} Customer
          </button>
        }
      />

      {/* Top B2B & B2C Segregation Tabs with Live Count */}
      <div className="flex items-center gap-3 border-b border-slate-200/90 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('B2B');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'B2B'
              ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>🏢 B2B Customers</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold font-mono ${
              activeTab === 'B2B' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {typeCounts.B2B || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('B2C');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'B2C'
              ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>👤 B2C Customers</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold font-mono ${
              activeTab === 'B2C' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {typeCounts.B2C || 0}
          </span>
        </button>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-96 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={`Search ${activeTab} customers by name, code, ${activeTab === 'B2B' ? 'company, GSTIN, ' : ''}or phone...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{activeTab}</span> customer accounts
        </div>
      </div>

      {/* Customers Data Table */}
      <DataTable
        columns={activeTab === 'B2B' ? b2bColumns : b2cColumns}
        data={customers}
        loading={loading}
        emptyMessage={`No ${activeTab} customers found. Click 'Add ${activeTab} Customer' to create one.`}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
        }}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => navigate(`/sales/customers/${row._id}`)}
              className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
              title="Open Customer 360° Profile"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
              title="Edit Customer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete Customer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.customer_name}` : 'Register New Customer'}
        size="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Customer / Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="e.g. Shree Krishna Hardware"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Company / Legal Trade Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Shree Krishna Hardware Trading Co."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. Ghanshyam Patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Reference</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. Sales Executive / Referral / Campaign"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Mobile Number</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 9825123987"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@company.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                Customer Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'B2B', label: 'B2B', desc: 'Business to Business', color: 'emerald' },
                  { id: 'B2C', label: 'B2C', desc: 'Business to Consumer', color: 'blue' },
                  { id: 'B2D', label: 'B2D', desc: 'Business to Dealer', color: 'purple' },
                  { id: 'D2C', label: 'D2C', desc: 'Direct to Consumer', color: 'amber' },
                ].map((t) => {
                  const isSelected = formData.customer_type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, customer_type: t.id })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-extrabold tracking-tight ${
                            isSelected ? 'text-emerald-800' : 'text-slate-800'
                          }`}
                        >
                          {t.label}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAACK1234E1Z5"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">PAN</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="AAACK1234E"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Credit Limit (₹)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              >
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
              </select>
            </div>
          </div>

          {/* Billing Address */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm mb-2">Billing & Delivery Location</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Address Line / Shop No. / Street"
                  value={formData.billing_address.address_line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billing_address: {
                        ...formData.billing_address,
                        address_line1: e.target.value,
                      },
                      shipping_address: {
                        ...formData.shipping_address,
                        address_line1: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="City (e.g. Surat, Ahmedabad)"
                  value={formData.billing_address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, city: e.target.value },
                      shipping_address: { ...formData.shipping_address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="State (e.g. Gujarat)"
                  value={formData.billing_address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, state: e.target.value },
                      shipping_address: { ...formData.shipping_address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Pincode"
                  value={formData.billing_address.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, pincode: e.target.value },
                      shipping_address: { ...formData.shipping_address, pincode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
