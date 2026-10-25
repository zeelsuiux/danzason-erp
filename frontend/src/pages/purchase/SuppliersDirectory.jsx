import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Star,
  Edit2,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { ft } from '../../services/procurementService';

export default function SuppliersDirectory() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('all'); // 'all' | 'raw_material' | 'finished' | 'contractor'
  const [typeCounts, setTypeCounts] = useState({ ALL: 0, B2B: 0, B2C: 0, D2C: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick category modal
  const [isQuickCatOpen, setIsQuickCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Form State
  const initialForm = {
    supplier_name: '',
    contact_person: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    supplier_type: 'B2B',
    supplier_classifications: ['raw_material'],
    category: 'raw_materials',
    categories: ['raw_materials'],
    rating: 4,
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
    loadCategories();
  }, []);

  useEffect(() => {
    loadSuppliers(pagination.page);
  }, [pagination.page, search, selectedCategory, selectedType, classificationFilter]);

  const loadCategories = async () => {
    try {
      const res = await ft.getCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSuppliers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getSuppliers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        supplier_classification: classificationFilter !== 'all' ? classificationFilter : undefined,
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
        if (res.meta.typeCounts) {
          setTypeCounts(res.meta.typeCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    const existingCats = Array.isArray(sup.categories) && sup.categories.length > 0
      ? sup.categories
      : [sup.category || 'raw_materials'];

    const classes = Array.isArray(sup.supplier_classifications) && sup.supplier_classifications.length > 0
      ? sup.supplier_classifications
      : (sup.supplier_classification === 'both'
        ? ['raw_material', 'finished', 'contractor']
        : [sup.supplier_classification || 'raw_material']);

    setFormData({
      supplier_name: sup.supplier_name || '',
      contact_person: sup.contact_person || '',
      email: sup.email || '',
      mobile: sup.mobile || '',
      gstin: sup.gstin || '',
      pan: sup.pan || '',
      supplier_type: sup.supplier_type || 'B2B',
      supplier_classifications: classes,
      category: existingCats[0] || 'raw_materials',
      categories: existingCats,
      rating: sup.rating || 4,
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
    if (!formData.supplier_name.trim()) {
      setErrorMessage('Supplier name is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      if (editingSupplier) {
        await ft.updateSupplier(editingSupplier._id, formData);
      } else {
        await ft.createSupplier(formData);
      }
      setIsModalOpen(false);
      loadSuppliers(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setSavingCat(true);
      const res = await ft.createCategory({ name: newCatName.trim() });
      await loadCategories();
      setFormData((prev) => ({ ...prev, category: res.data?.code || newCatName.trim() }));
      setNewCatName('');
      setIsQuickCatOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to add category');
    } finally {
      setSavingCat(false);
    }
  };

  const columns = [
    {
      header: 'Supplier Details',
      key: 'supplier_name',
      render: (_, row) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/purchase/suppliers/${row._id}`);
            }}
            className="text-left group/btn"
          >
            <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 group-hover/btn:text-brand group-hover/btn:underline transition-colors cursor-pointer">
              <Building className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>{row.supplier_name}</span>
            </p>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium text-[11px]">
              {row.supplier_code}
            </span>
            {row.gstin && <span>GSTIN: {row.gstin}</span>}
          </div>
          {(row.email || row.mobile) && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 pt-0.5">
              {row.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> {row.email}
                </span>
              )}
              {row.mobile && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" /> {row.mobile}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Person',
      key: 'contact_person',
      render: (val, row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{val || '—'}</p>
          {row.mobile && <p className="text-xs text-slate-400 font-mono mt-0.5">{row.mobile}</p>}
        </div>
      ),
    },
    {
      header: 'Classification',
      key: 'supplier_classifications',
      render: (classes, row) => {
        const list = Array.isArray(classes) && classes.length > 0
          ? classes
          : (row.supplier_classification === 'both'
            ? ['raw_material', 'finished', 'contractor']
            : [row.supplier_classification || 'raw_material']);
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {(list.includes('raw_material') || list.includes('both')) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Raw Material
              </span>
            )}
            {(list.includes('finished') || list.includes('both')) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Finished
              </span>
            )}
            {(list.includes('contractor') || list.includes('manufacturing') || list.includes('both')) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Contractor
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Category',
      key: 'category',
      render: (val, row) => {
        const catList = Array.isArray(row.categories) && row.categories.length > 0
          ? row.categories
          : [row.category_id?.name || val || 'Vendor'];
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {catList.map((cat, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-brand border border-emerald-200 capitalize"
              >
                {cat}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Type',
      key: 'supplier_type',
      render: (val) => {
        const type = val || 'B2B';
        const badgeClasses = {
          B2B: 'bg-blue-50 text-blue-700 border-blue-200',
          B2C: 'bg-purple-50 text-purple-700 border-purple-200',
          D2C: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          WHOLESALE: 'bg-amber-50 text-amber-700 border-amber-200',
          MANUFACTURER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          TRADER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide ${
              badgeClasses[type] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {type}
          </span>
        );
      },
    },
    {
      header: 'Location',
      key: 'address',
      render: (addr) => (
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-800 text-sm">{addr?.city || '—'}</p>
          <p className="text-slate-400 text-xs mt-0.5">{addr?.state || ''}</p>
        </div>
      ),
    },
    {
      header: 'Pending Balance',
      key: 'pending_balance',
      render: (val) => (
        <span className="font-mono font-semibold text-slate-900 text-sm">
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Rating',
      key: 'rating',
      render: (val) => (
        <div className="flex items-center gap-0.5 text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < (val || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      header: 'Terms',
      key: 'payment_terms',
      render: (val) => <span className="text-xs text-slate-600">{val || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor profiles, contact details, payment terms, and categories."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Suppliers' },
        ]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        }
      />

      {/* Classification Filter Tabs: All | Raw Material | Finished | Contractor */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setClassificationFilter('all');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            classificationFilter === 'all'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setClassificationFilter('raw_material');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            classificationFilter === 'raw_material'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Raw Material</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setClassificationFilter('finished');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            classificationFilter === 'finished'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Finished</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setClassificationFilter('contractor');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            classificationFilter === 'contractor'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Contractor / Job Work</span>
        </button>
      </div>

      {/* Supplier Type Tabs (B2B, B2C, D2C) with Count Badges */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 overflow-x-auto">
        {[
          { key: 'ALL', label: 'All Suppliers', count: typeCounts.ALL || pagination.total || 0 },
          { key: 'B2B', label: 'B2B', count: typeCounts.B2B || 0 },
          { key: 'B2C', label: 'B2C', count: typeCounts.B2C || 0 },
          { key: 'D2C', label: 'D2C', count: typeCounts.D2C || 0 },
        ].map((tab) => {
          const isActive = selectedType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedType(tab.key);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold font-mono transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2.5 w-full sm:w-96 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, contact, GSTIN..."
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand w-full sm:w-52"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.code || cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => navigate(`/purchase/suppliers/${row._id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => navigate(`/purchase/suppliers/${row._id}`)}
              className="p-1.5 text-slate-500 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
              title="View Supplier 360 Profile & Ledger"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 text-slate-500 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
              title="Edit Supplier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_name}` : 'Add New Supplier'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Supplier Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="e.g. Apex Metals & Alloys Ltd."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajesh@apexmetals.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Mobile / Phone</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="9825012345"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAACA1234F1Z8"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">PAN Number</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="AAACA1234F"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Supplier Classification / Type (Multi-select) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
                {[
                  { id: 'raw_material', label: 'Raw Material Supplier', desc: 'Raw Material (Fabric, Trims)', color: 'blue' },
                  { id: 'finished', label: 'Finished Product Supplier', desc: 'Finished Goods (Ready Garments)', color: 'emerald' },
                  { id: 'contractor', label: 'Contractor / Job Worker', desc: 'Job Work / Processing Contractor', color: 'amber' },
                ].map((item) => {
                  const isSelected = (formData.supplier_classifications || []).includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const current = formData.supplier_classifications || [];
                        const updated = isSelected
                          ? current.filter((x) => x !== item.id)
                          : [...current, item.id];
                        setFormData({
                          ...formData,
                          supplier_classifications: updated.length > 0 ? updated : [item.id],
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? item.color === 'blue'
                            ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20'
                            : item.color === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                            : 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-brand"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 text-sm">
                  Supplier Categories <span className="text-xs font-normal text-slate-500">(Multiple Selectable)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCatOpen(true)}
                  className="text-brand text-xs font-bold hover:underline"
                >
                  + Add New Category
                </button>
              </div>
              <div className="flex flex-wrap gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 min-h-[46px]">
                {[{ code: 'raw_materials', name: 'Raw Materials' }, ...categories].map((c) => {
                  const val = c.code || c.name;
                  const label = c.name || c.code;
                  const isSelected = formData.categories?.includes(val);
                  return (
                    <button
                      type="button"
                      key={val}
                      onClick={() => {
                        const current = formData.categories || [];
                        const updated = isSelected
                          ? current.filter((x) => x !== val)
                          : [...current, val];
                        const finalCats = updated.length > 0 ? updated : [val];
                        setFormData({
                          ...formData,
                          categories: finalCats,
                          category: finalCats[0],
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Supplier Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.supplier_type || 'B2B'}
                onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              >
                <option value="B2B">B2B (Business to Business)</option>
                <option value="B2C">B2C (Business to Consumer)</option>
                <option value="D2C">D2C (Direct to Consumer)</option>
                <option value="WHOLESALE">WHOLESALE</option>
                <option value="MANUFACTURER">MANUFACTURER</option>
                <option value="TRADER">TRADER</option>
              </select>
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

          {/* Address */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm mb-2">Location & Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={formData.address.address_line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, address_line1: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="State"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
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
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Category Modal */}
      <Modal
        isOpen={isQuickCatOpen}
        onClose={() => setIsQuickCatOpen(false)}
        title="Quick Add Category"
        size="sm"
      >
        <form onSubmit={handleQuickAddCategory} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Dyes & Finishes"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickCatOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCat}
              className="px-4 py-1.5 rounded-lg bg-brand text-white font-semibold"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
