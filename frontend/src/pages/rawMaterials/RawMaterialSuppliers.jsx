import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Layers,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Trash2,
  Truck,
  Boxes,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { ft } from '../../services/procurementService';

export default function RawMaterialSuppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const initialForm = {
    supplier_name: '',
    supplier_code: '',
    contact_person: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    supplier_type: 'B2B',
    supplier_classification: 'raw_material',
    material_categories: ['Fabric'], // e.g. Fabric, Yarn, Thread, Buttons, Zippers, Packaging
    payment_terms: 'Net 30 Days',
    credit_limit: 0,
    address: {
      address_line1: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
    bank_details: {
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch: '',
    },
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadSuppliers(pagination.page);
  }, [pagination.page, search]);

  const loadSuppliers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getSuppliers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        supplier_classification: 'raw_material',
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setSuppliers(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error('Failed to load raw material suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setErrorMessage('');
    setSuccessMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      supplier_name: sup.supplier_name || '',
      supplier_code: sup.supplier_code || '',
      contact_person: sup.contact_person || '',
      email: sup.email || '',
      mobile: sup.mobile || '',
      gstin: sup.gstin || '',
      pan: sup.pan || '',
      supplier_type: sup.supplier_type || 'B2B',
      supplier_classification: 'raw_material',
      payment_terms: sup.payment_terms || 'Net 30 Days',
      credit_limit: sup.credit_limit || 0,
      address: {
        address_line1: sup.address?.address_line1 || '',
        city: sup.address?.city || '',
        state: sup.address?.state || 'Gujarat',
        pincode: sup.address?.pincode || '',
      },
      bank_details: {
        bank_name: sup.bank_details?.bank_name || '',
        account_number: sup.bank_details?.account_number || '',
        ifsc_code: sup.bank_details?.ifsc_code || '',
        branch: sup.bank_details?.branch || '',
      },
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formData.supplier_name.trim()) {
      setErrorMessage('Supplier Name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        supplier_classification: 'raw_material',
      };

      if (editingSupplier) {
        await ft.updateSupplier(editingSupplier._id, payload);
      } else {
        await ft.createSupplier(payload);
      }

      setIsModalOpen(false);
      loadSuppliers(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save raw material supplier');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: 'Supplier Code',
      key: 'supplier_code',
      cellClassName: 'font-mono text-xs font-bold text-blue-700',
      render: (val) => val || 'SUP-RM',
    },
    {
      header: 'Raw Material Supplier',
      key: 'supplier_name',
      render: (val, row) => (
        <div>
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{val}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-500 font-mono">
              {row.contact_person ? `Contact: ${row.contact_person}` : ''}
            </span>
            {row.gstin && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                GST: {row.gstin}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Materials Supplied',
      key: 'category',
      render: (val, row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Layers className="w-3 h-3 text-blue-600" />
          <span>{row.category || 'Fabric / Yarn / Trims'}</span>
        </span>
      ),
    },
    {
      header: 'City & Location',
      key: 'address',
      render: (addr) => (
        <span className="text-xs text-slate-700 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{addr?.city ? `${addr.city}, ${addr.state || ''}` : 'Gujarat'}</span>
        </span>
      ),
    },
    {
      header: 'Contact Info',
      key: 'mobile',
      render: (val, row) => (
        <div className="text-xs space-y-0.5 font-mono">
          {val && (
            <p className="flex items-center gap-1 text-slate-700">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{val}</span>
            </p>
          )}
          {row.email && (
            <p className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{row.email}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Pending Balance',
      key: 'pending_balance',
      cellClassName: 'font-mono text-sm font-bold text-right',
      render: (val) => (
        <span className={val > 0 ? 'text-rose-600' : 'text-emerald-700'}>
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      cellClassName: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/raw-materials/orders?supplier_id=${row._id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
            title="View RM Orders"
          >
            <Boxes className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Edit Supplier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Suppliers"
        subtitle="Manage fabric mills, yarn spinners, thread manufacturers, and packaging raw material suppliers"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/raw-materials/orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              <span>View RM Orders</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add RM Supplier
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total RM Suppliers
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || suppliers.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Fabric, Yarn, Trims & Packaging</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Catalog Items
          </p>
          <p className="text-2xl font-black text-blue-700 mt-1 font-mono">
            3 Active Materials
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Linked to standard BOM</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Outstanding Material Payable
          </p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
            ₹
            {suppliers
              .reduce((acc, s) => acc + (s.pending_balance || 0), 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Across active suppliers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name, contact, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
            Raw Material Classification: Active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage="No raw material suppliers found. Click '+ Add RM Supplier' to create one."
        />
      </div>

      {/* Create / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Raw Material Supplier' : 'Add Raw Material Supplier'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Surat Cotton Mills Ltd."
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Patel"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile / Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 9825012345"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. sales@mill.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Tax ID)
              </label>
              <input
                type="text"
                placeholder="e.g. 24AABCA1234F1Z9"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Location Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Factory / Warehouse Address Line"
                  value={formData.address.address_line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, address_line1: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="City (e.g. Surat / Ahmedabad)"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="State (e.g. Gujarat)"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Pincode"
                  value={formData.address.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, pincode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save RM Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
