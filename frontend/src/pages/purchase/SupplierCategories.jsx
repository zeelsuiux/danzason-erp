import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tags, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function SupplierCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const initialForm = {
    name: '',
    code: '',
    description: '',
    is_active: true,
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await ft.getCategories();
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setErrorMessage(err.message || 'Failed to load supplier categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData(initialForm);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      code: cat.code || '',
      description: cat.description || '',
      is_active: cat.is_active ?? true,
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this category?')) return;
    try {
      await ft.deleteCategory(id);
      loadCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      if (editingCategory) {
        await ft.updateCategory(editingCategory._id, formData);
      } else {
        await ft.createCategory(formData);
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      header: 'Category Name',
      key: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-brand">
            <Tags className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm">{val}</span>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      key: 'code',
      cellClassName: 'font-mono text-xs font-medium text-slate-700',
    },
    {
      header: 'Description',
      key: 'description',
      render: (val) => <span className="text-xs text-slate-600">{val || '—'}</span>,
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Supplier Categories"
        subtitle="Classify vendors by industry domain, materials supplied, or trade type."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Categories' },
        ]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredCategories}
        loading={loading}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-2 text-slate-500 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
              title="Edit Category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row._id)}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Supplier Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Fabric & Textiles"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Category Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. FABRIC"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief details regarding this category classification..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
            />
            <label htmlFor="is_active" className="font-semibold text-slate-700 cursor-pointer text-sm">
              Active Category
            </label>
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
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editingCategory ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
