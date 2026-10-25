import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Scissors,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Layers,
  Boxes,
  Truck,
  Eye,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { ft } from '../../services/procurementService';

export default function ProcessingContractors() {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const initialForm = {
    supplier_name: '',
    supplier_code: '',
    contact_person: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    supplier_type: 'MANUFACTURER',
    supplier_classification: 'manufacturing',
    process_type: 'Stitching & Tailoring', // Stitching, Dyeing, Printing, Washing, Embroidery
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
    loadContractors(pagination.page);
  }, [pagination.page, search]);

  const loadContractors = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getSuppliers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        supplier_classification: 'manufacturing',
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setContractors(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error('Failed to load processing contractors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingContractor(null);
    setFormData(initialForm);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingContractor(c);
    setFormData({
      supplier_name: c.supplier_name || '',
      supplier_code: c.supplier_code || '',
      contact_person: c.contact_person || '',
      email: c.email || '',
      mobile: c.mobile || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      supplier_type: c.supplier_type || 'MANUFACTURER',
      supplier_classification: 'manufacturing',
      process_type: c.process_type || 'Stitching & Tailoring',
      payment_terms: c.payment_terms || 'Net 30 Days',
      credit_limit: c.credit_limit || 0,
      address: {
        address_line1: c.address?.address_line1 || '',
        city: c.address?.city || '',
        state: c.address?.state || 'Gujarat',
        pincode: c.address?.pincode || '',
      },
      bank_details: {
        bank_name: c.bank_details?.bank_name || '',
        account_number: c.bank_details?.account_number || '',
        ifsc_code: c.bank_details?.ifsc_code || '',
        branch: c.bank_details?.branch || '',
      },
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formData.supplier_name.trim()) {
      setErrorMessage('Contractor / Karigar Name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        supplier_classification: 'manufacturing',
      };

      if (editingContractor) {
        await ft.updateSupplier(editingContractor._id, payload);
      } else {
        await ft.createSupplier(payload);
      }

      setIsModalOpen(false);
      loadContractors(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save contractor');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: 'Code',
      key: 'supplier_code',
      cellClassName: 'font-mono text-xs font-bold text-amber-700',
      render: (val) => val || 'SUP-M',
    },
    {
      header: 'Contractor / Karigar Unit',
      key: 'supplier_name',
      render: (val, row) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/processing/contractors/${row._id}`);
          }}
          className="cursor-pointer group"
        >
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-amber-700 transition">
            <Scissors className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="group-hover:underline">{val}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-500 font-mono">
              {row.contact_person ? `Master / Incharge: ${row.contact_person}` : ''}
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
      header: 'Processing Type',
      key: 'supplier_type',
      render: (val, row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
          <Scissors className="w-3 h-3 text-amber-600" />
          <span>{row.process_type || 'Job Work / Stitching'}</span>
        </span>
      ),
    },
    {
      header: 'Location / Workshop',
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
      header: 'Pending Service Due',
      key: 'pending_balance',
      cellClassName: 'font-mono text-sm font-bold text-right',
      render: (val) => (
        <span className={val > 0 ? 'text-amber-800' : 'text-emerald-700'}>
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
            onClick={() => navigate(`/processing/contractors/${row._id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
            title="View Contractor Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/processing/orders?contractor_id=${row._id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
            title="View Job Work Orders"
          >
            <Boxes className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Edit Contractor"
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
        title="Job-Work Contractors & Karigars"
        subtitle="Manage external tailors, stitching units, dyeing mills, printing presses, and job-work contractors"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/processing/material-tracking')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Material Tracking</span>
            </button>
            <button
              onClick={() => navigate('/processing/orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              <span>Job Orders</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Contractor / Karigar
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Job-Work Units
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || contractors.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Stitching, Dyeing & Finishing units</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Material Balance At Contractors
          </p>
          <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
            Active Tracking
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Company raw materials in work</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Labor & Service Due
          </p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
            ₹
            {contractors
              .reduce((acc, c) => acc + (c.pending_balance || 0), 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Pending service bill payouts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contractor name, contact, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <span className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded border border-amber-200">
          Processing Classification: Job-Work External Contractor
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={contractors}
          loading={loading}
          pagination={pagination}
          onRowClick={(row) => navigate(`/processing/contractors/${row._id}`)}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage="No job-work contractors found. Click '+ Add Contractor / Karigar' to register one."
        />
      </div>

      {/* Create / Edit Contractor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContractor ? 'Edit Contractor / Karigar' : 'Add Job-Work Contractor / Karigar'}
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
                Contractor / Workshop Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ABC Garments Works"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Master / Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Bhai"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile / Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 9825099887"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processing / Job Work Type
              </label>
              <select
                value={formData.process_type}
                onChange={(e) => setFormData({ ...formData, process_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Stitching & Tailoring">Stitching & Tailoring</option>
                <option value="Dyeing & Washing">Dyeing & Washing</option>
                <option value="Printing & Heat Transfer">Printing & Heat Transfer</option>
                <option value="Embroidery & Trimming">Embroidery & Trimming</option>
                <option value="Full Garment Assembly">Full Garment Assembly</option>
              </select>
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
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Weekly Payment">Weekly Payment</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Workshop Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="GIDC / Industrial Estate Unit No."
                  value={formData.address.address_line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, address_line1: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="City (e.g. Ahmedabad)"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingContractor ? 'Update Contractor' : 'Save Contractor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
