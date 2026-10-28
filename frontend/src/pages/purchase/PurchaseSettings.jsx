import React, { useEffect, useState } from 'react';
import {
  Building2,
  Tags,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Star,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldAlert,
  Power,
  Layers,
  Briefcase,
  Crown,
  GitFork,
  ArrowRight,
  Landmark,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft, St } from '../../services/procurementService';
import teamService from '../../services/teamService';
import bankAccountService from '../../services/bankAccountService';

export default function PurchaseSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    urlTab === 'departments'
      ? 'departments'
      : urlTab === 'hierarchy'
      ? 'hierarchy'
      : urlTab === 'bank_accounts'
      ? 'bank_accounts'
      : 'categories'
  );

  // ======================== WAREHOUSES STATE ========================
  const [warehouses, setWarehouses] = useState([]);
  const [whLoading, setWhLoading] = useState(true);
  const [whSearch, setWhSearch] = useState('');
  const [whStatusFilter, setWhStatusFilter] = useState('');
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [whSaving, setWhSaving] = useState(false);
  const [whError, setWhError] = useState('');

  const initialWhForm = {
    warehouse_name: '',
    warehouse_code: '',
    warehouse_type: 'central',
    address: {
      line1: '',
      line2: '',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '',
      country: 'India',
    },
    contact_person: '',
    mobile: '',
    status: 'active',
    is_default: false,
    description: '',
  };
  const [whFormData, setWhFormData] = useState(initialWhForm);

  // ======================== CATEGORIES STATE ========================
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catSearch, setCatSearch] = useState('');
  const [catTypeTab, setCatTypeTab] = useState('all'); // 'all' | 'raw_material' | 'finished' | 'contractor'
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');

  const initialCatForm = {
    name: '',
    code: '',
    description: '',
    category_types: ['raw_material', 'finished'],
    is_active: true,
  };
  const [catFormData, setCatFormData] = useState(initialCatForm);

  // ======================== SUPPLIERS STATE ========================
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(true);
  const [supSearch, setSupSearch] = useState('');
  const [supTypeTab, setSupTypeTab] = useState('all'); // 'all' | 'raw_material' | 'finished' | 'contractor'
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supSaving, setSupSaving] = useState(false);
  const [supError, setSupError] = useState('');

  const initialSupForm = {
    supplier_name: '',
    supplier_code: '',
    contact_person: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    supplier_type: 'B2B',
    supplier_classifications: ['raw_material'],
    categories: ['raw_materials'],
    payment_terms: 'Net 30 Days',
    credit_limit: 0,
    address: {
      line1: '',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '',
    },
  };
  const [supFormData, setSupFormData] = useState(initialSupForm);

  // ======================== DEPARTMENTS STATE ========================
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState('all');
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState('');

  const initialDeptForm = {
    name: '',
    code: '',
    description: '',
    head_of_department: '',
    is_active: true,
  };
  const [deptFormData, setDeptFormData] = useState(initialDeptForm);
  // ======================== HIERARCHY STATE ========================
  const [hierarchies, setHierarchies] = useState([]);
  const [hierLoading, setHierLoading] = useState(true);
  const [hierSearch, setHierSearch] = useState('');
  const [hierStatusFilter, setHierStatusFilter] = useState('all');
  const [hierSupervisoryFilter, setHierSupervisoryFilter] = useState('all');
  const [isHierModalOpen, setIsHierModalOpen] = useState(false);
  const [editingHier, setEditingHier] = useState(null);
  const [hierSaving, setHierSaving] = useState(false);
  const [hierError, setHierError] = useState('');

  const initialHierForm = {
    name: '',
    code: '',
    rank: 3,
    can_supervise: true,
    requires_reporting: false,
    badge_color: 'purple',
    description: '',
    is_active: true,
  };
  const [hierFormData, setHierFormData] = useState(initialHierForm);

  // ======================== BANK ACCOUNTS STATE ========================
  const [bankAccounts, setBankAccounts] = useState([]);
  const [baLoading, setBaLoading] = useState(true);
  const [baSearch, setBaSearch] = useState('');
  const [baTypeFilter, setBaTypeFilter] = useState('all'); // 'all' | 'current' | 'savings' | 'overdraft_cc' | 'cash' | 'upi'
  const [isBaModalOpen, setIsBaModalOpen] = useState(false);
  const [editingBa, setEditingBa] = useState(null);
  const [baSaving, setBaSaving] = useState(false);
  const [baError, setBaError] = useState('');
  const [baSummary, setBaSummary] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const initialBaForm = {
    account_name: '',
    bank_name: '',
    account_number: '',
    account_holder_name: 'Danza-Son Apparels & Textiles',
    account_type: 'current',
    ifsc_code: '',
    branch_name: '',
    upi_id: '',
    opening_balance: 0,
    current_balance: 0,
    is_default_receiving: false,
    is_default_payment: false,
    is_active: true,
    notes: '',
  };
  const [baFormData, setBaFormData] = useState(initialBaForm);

  useEffect(() => {
    loadWarehouses();
    loadCategories();
    loadSuppliers();
    loadDepartments();
    loadHierarchies();
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setBaLoading(true);
      setBaError('');
      const res = await bankAccountService.getBankAccounts();
      const list = Array.isArray(res.data) ? res.data : [];
      setBankAccounts(list);
      setBaSummary(res.summary || null);
    } catch (err) {
      setBaError(err.message || 'Failed to load bank accounts');
    } finally {
      setBaLoading(false);
    }
  };

  const handleOpenAddBa = () => {
    setEditingBa(null);
    setBaFormData(initialBaForm);
    setBaError('');
    setIsBaModalOpen(true);
  };

  const handleOpenEditBa = (ba) => {
    setEditingBa(ba);
    setBaFormData({
      account_name: ba.account_name || '',
      bank_name: ba.bank_name || '',
      account_number: ba.account_number || '',
      account_holder_name: ba.account_holder_name || 'Danza-Son Apparels & Textiles',
      account_type: ba.account_type || 'current',
      ifsc_code: ba.ifsc_code || '',
      branch_name: ba.branch_name || '',
      upi_id: ba.upi_id || '',
      opening_balance: ba.opening_balance ?? 0,
      current_balance: ba.current_balance ?? 0,
      is_default_receiving: Boolean(ba.is_default_receiving),
      is_default_payment: Boolean(ba.is_default_payment),
      is_active: ba.is_active !== undefined ? ba.is_active : true,
      notes: ba.notes || '',
    });
    setBaError('');
    setIsBaModalOpen(true);
  };

  const handleSaveBa = async (e) => {
    e.preventDefault();
    try {
      setBaSaving(true);
      setBaError('');
      if (!baFormData.account_name.trim()) throw new Error('Account display name is required');
      if (!baFormData.bank_name.trim()) throw new Error('Bank name is required');
      if (!baFormData.account_number.trim()) throw new Error('Account number is required');

      if (editingBa) {
        await bankAccountService.updateBankAccount(editingBa._id, baFormData);
      } else {
        await bankAccountService.createBankAccount(baFormData);
      }

      setIsBaModalOpen(false);
      loadBankAccounts();
    } catch (err) {
      setBaError(err.message || 'Failed to save bank account');
    } finally {
      setBaSaving(false);
    }
  };

  const handleDeleteBa = async (ba) => {
    if (ba.is_default_receiving || ba.is_default_payment) {
      alert('Cannot delete a default bank account. Please assign default status to another bank first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete bank account "${ba.account_name}" (${ba.bank_name})?`)) {
      return;
    }
    try {
      await bankAccountService.deleteBankAccount(ba._id);
      loadBankAccounts();
    } catch (err) {
      alert(err.message || 'Failed to delete bank account');
    }
  };

  const handleToggleBaStatus = async (ba) => {
    try {
      await bankAccountService.updateBankAccount(ba._id, { is_active: !ba.is_active });
      loadBankAccounts();
    } catch (err) {
      alert(err.message || 'Failed to update account status');
    }
  };

  const handleSetDefaultReceiving = async (ba) => {
    try {
      await bankAccountService.updateBankAccount(ba._id, { is_default_receiving: true });
      loadBankAccounts();
    } catch (err) {
      alert(err.message || 'Failed to set default receiving account');
    }
  };

  const handleSetDefaultPayment = async (ba) => {
    try {
      await bankAccountService.updateBankAccount(ba._id, { is_default_payment: true });
      loadBankAccounts();
    } catch (err) {
      alert(err.message || 'Failed to set default paying account');
    }
  };

  const copyToClipboard = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredBankAccounts = bankAccounts.filter((acc) => {
    const q = baSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      acc.account_name?.toLowerCase().includes(q) ||
      acc.bank_name?.toLowerCase().includes(q) ||
      acc.account_number?.toLowerCase().includes(q) ||
      acc.ifsc_code?.toLowerCase().includes(q) ||
      acc.upi_id?.toLowerCase().includes(q) ||
      acc.branch_name?.toLowerCase().includes(q);

    const matchType = baTypeFilter === 'all' || acc.account_type === baTypeFilter;
    return matchSearch && matchType;
  });

  const loadSuppliers = async () => {
    try {
      setSupLoading(true);
      setSupError('');
      const res = await ft.getSuppliers({ limit: 200 });
      const list = Array.isArray(res.data) ? res.data : [];
      setSuppliers(list);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setSupError(err.message || 'Failed to load suppliers');
    } finally {
      setSupLoading(false);
    }
  };

  // ======================== WAREHOUSE FUNCTIONS ========================
  const loadWarehouses = async () => {
    try {
      setWhLoading(true);
      setWhError('');
      const res = await St.getWarehouses();
      const list = res?.data?.warehouses || res?.data || res?.warehouses || [];
      setWarehouses(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      setWhError(err.message || 'Failed to load warehouses');
    } finally {
      setWhLoading(false);
    }
  };

  const handleOpenAddWarehouse = () => {
    setEditingWh(null);
    setWhFormData({
      ...initialWhForm,
      is_default: warehouses.length === 0, // First warehouse default automatically
    });
    setWhError('');
    setIsWhModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    setEditingWh(wh);
    setWhFormData({
      warehouse_name: wh.warehouse_name || '',
      warehouse_code: wh.warehouse_code || '',
      warehouse_type: wh.warehouse_type || 'central',
      address: {
        line1: wh.address?.line1 || '',
        line2: wh.address?.line2 || '',
        city: wh.address?.city || 'Ahmedabad',
        state: wh.address?.state || 'Gujarat',
        pincode: wh.address?.pincode || '',
        country: wh.address?.country || 'India',
      },
      contact_person: wh.contact_person || '',
      mobile: wh.mobile || '',
      status: wh.status || 'active',
      is_default: Boolean(wh.is_default),
      description: wh.description || '',
    });
    setWhError('');
    setIsWhModalOpen(true);
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    if (!whFormData.warehouse_name.trim()) {
      setWhError('Warehouse name is required');
      return;
    }
    if (!whFormData.warehouse_code.trim()) {
      setWhError('Warehouse code is required');
      return;
    }

    try {
      setWhSaving(true);
      setWhError('');
      if (editingWh) {
        await St.updateWarehouse(editingWh._id, whFormData);
      } else {
        await St.createWarehouse(whFormData);
      }
      setIsWhModalOpen(false);
      loadWarehouses();
    } catch (err) {
      setWhError(err.message || 'Failed to save warehouse');
    } finally {
      setWhSaving(false);
    }
  };

  const handleSetDefaultWarehouse = async (wh) => {
    try {
      await St.setDefaultWarehouse(wh._id);
      loadWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to set default warehouse');
    }
  };

  const handleToggleWarehouseStatus = async (wh) => {
    try {
      await St.toggleWarehouseStatus(wh._id);
      loadWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to toggle warehouse status');
    }
  };

  const handleDeleteWarehouse = async (wh) => {
    if (!window.confirm(`Are you sure you want to remove warehouse "${wh.warehouse_name}"?`)) {
      return;
    }
    try {
      await St.deleteWarehouse(wh._id);
      loadWarehouses();
    } catch (err) {
      alert(err.message || 'Cannot delete warehouse because it is linked to transactions. Deactivate it instead.');
    }
  };

  // ======================== CATEGORY FUNCTIONS ========================
  const loadCategories = async () => {
    try {
      setCatLoading(true);
      setCatError('');
      const res = await ft.getCategories();
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCatError(err.message || 'Failed to load supplier categories');
    } finally {
      setCatLoading(false);
    }
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatFormData(initialCatForm);
    setCatError('');
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatFormData({
      name: cat.name || '',
      code: cat.code || '',
      description: cat.description || '',
      category_types: Array.isArray(cat.category_types) && cat.category_types.length > 0
        ? cat.category_types
        : ['raw_material', 'finished'],
      is_active: cat.is_active !== undefined ? cat.is_active : true,
    });
    setCatError('');
    setIsCatModalOpen(true);
  };

  const handleDeleteCategory = async (cat) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${cat.name}"? Suppliers linked to this category will retain their history.`
      )
    ) {
      return;
    }
    try {
      await ft.deleteCategory(cat._id);
      loadCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleToggleCatActive = async (cat) => {
    try {
      await ft.updateCategory(cat._id, { is_active: !cat.is_active });
      loadCategories();
    } catch (err) {
      alert(err.message || 'Failed to update category status');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      setCatError('Category name is required');
      return;
    }
    if (!catFormData.category_types || catFormData.category_types.length === 0) {
      setCatError('Please select at least one classification (Raw Material, Finished, or Contractor)');
      return;
    }

    try {
      setCatSaving(true);
      setCatError('');
      if (editingCategory) {
        await ft.updateCategory(editingCategory._id, catFormData);
      } else {
        await ft.createCategory(catFormData);
      }
      setIsCatModalOpen(false);
      loadCategories();
    } catch (err) {
      setCatError(err.message || 'Failed to save category');
    } finally {
      setCatSaving(false);
    }
  };

  // ======================== SUPPLIER FUNCTIONS ========================
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupFormData(initialSupForm);
    setSupError('');
    setIsSupModalOpen(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    const classes = Array.isArray(sup.supplier_classifications) && sup.supplier_classifications.length > 0
      ? sup.supplier_classifications
      : (sup.supplier_classification === 'both'
        ? ['raw_material', 'finished', 'contractor']
        : [sup.supplier_classification || 'raw_material']);

    setSupFormData({
      supplier_name: sup.supplier_name || '',
      supplier_code: sup.supplier_code || '',
      contact_person: sup.contact_person || '',
      email: sup.email || '',
      mobile: sup.mobile || '',
      gstin: sup.gstin || '',
      pan: sup.pan || '',
      supplier_type: sup.supplier_type || 'B2B',
      supplier_classifications: classes,
      categories: Array.isArray(sup.categories) && sup.categories.length > 0 ? sup.categories : ['raw_materials'],
      payment_terms: sup.payment_terms || 'Net 30 Days',
      credit_limit: sup.credit_limit || 0,
      address: {
        line1: sup.address?.address_line1 || sup.address?.line1 || '',
        city: sup.address?.city || 'Ahmedabad',
        state: sup.address?.state || 'Gujarat',
        pincode: sup.address?.pincode || '',
      },
    });
    setSupError('');
    setIsSupModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supFormData.supplier_name.trim()) {
      setSupError('Supplier name is required');
      return;
    }
    if (!supFormData.supplier_classifications || supFormData.supplier_classifications.length === 0) {
      setSupError('Please select at least one classification (Raw Material, Finished, or Contractor)');
      return;
    }

    try {
      setSupSaving(true);
      setSupError('');
      if (editingSupplier) {
        await ft.updateSupplier(editingSupplier._id, supFormData);
      } else {
        await ft.createSupplier(supFormData);
      }
      setIsSupModalOpen(false);
      loadSuppliers();
    } catch (err) {
      setSupError(err.message || 'Failed to save supplier');
    } finally {
      setSupSaving(false);
    }
  };

  // ======================== FILTERED DATA ========================
  const filteredWarehouses = warehouses.filter((wh) => {
    const q = whSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      wh.warehouse_name?.toLowerCase().includes(q) ||
      wh.warehouse_code?.toLowerCase().includes(q) ||
      wh.address?.city?.toLowerCase().includes(q) ||
      wh.contact_person?.toLowerCase().includes(q);
    const matchStatus = !whStatusFilter || wh.status === whStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredCategories = categories.filter((c) => {
    const q = catSearch.toLowerCase().trim();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
    const types = Array.isArray(c.category_types) && c.category_types.length > 0
      ? c.category_types
      : ['raw_material', 'finished'];
    const matchType =
      catTypeTab === 'all' ||
      (catTypeTab === 'raw_material' && types.includes('raw_material')) ||
      (catTypeTab === 'finished' && types.includes('finished')) ||
      (catTypeTab === 'contractor' && (types.includes('contractor') || types.includes('manufacturing')));
    return matchSearch && matchType;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.supplier_name?.toLowerCase().includes(q) ||
      s.supplier_code?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q) ||
      s.mobile?.includes(q) ||
      s.gstin?.toLowerCase().includes(q);

    const classes = Array.isArray(s.supplier_classifications) && s.supplier_classifications.length > 0
      ? s.supplier_classifications
      : (s.supplier_classification === 'both'
        ? ['raw_material', 'finished', 'contractor']
        : [s.supplier_classification || 'raw_material']);

    const matchType =
      supTypeTab === 'all' ||
      (supTypeTab === 'raw_material' && (classes.includes('raw_material') || classes.includes('both'))) ||
      (supTypeTab === 'finished' && (classes.includes('finished') || classes.includes('both'))) ||
      (supTypeTab === 'contractor' && (classes.includes('contractor') || classes.includes('manufacturing') || classes.includes('both')));

    return matchSearch && matchType;
  });

  // ======================== DEPARTMENT FUNCTIONS ========================
  const loadDepartments = async () => {
    try {
      setDeptLoading(true);
      setDeptError('');
      const res = await teamService.getDepartments({
        search: deptSearch.trim() || undefined,
        status: deptStatusFilter !== 'all' ? deptStatusFilter : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setDeptError(err.message || 'Failed to load organization departments');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleOpenAddDepartment = () => {
    setEditingDept(null);
    setDeptFormData(initialDeptForm);
    setDeptError('');
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDepartment = (dept) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      head_of_department: dept.head_of_department || '',
      is_active: dept.is_active !== undefined ? dept.is_active : true,
    });
    setDeptError('');
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setDeptSaving(true);
    setDeptError('');

    try {
      if (editingDept) {
        await teamService.updateDepartment(editingDept._id, deptFormData);
      } else {
        await teamService.createDepartment(deptFormData);
      }
      setIsDeptModalOpen(false);
      loadDepartments();
    } catch (err) {
      setDeptError(err.message || 'Failed to save department');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleToggleDeptStatus = async (dept) => {
    try {
      await teamService.updateDepartment(dept._id, { is_active: !dept.is_active });
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to update department status');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
      return;
    }
    try {
      await teamService.deleteDepartment(dept._id);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const q = deptSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      d.name?.toLowerCase().includes(q) ||
      d.code?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.head_of_department?.toLowerCase().includes(q);

    const matchStatus =
      deptStatusFilter === 'all' ||
      (deptStatusFilter === 'active' && d.is_active) ||
      (deptStatusFilter === 'inactive' && !d.is_active);

    return matchSearch && matchStatus;
  });


  // ======================== HIERARCHY FUNCTIONS ========================
  const loadHierarchies = async () => {
    try {
      setHierLoading(true);
      setHierError('');
      const res = await teamService.getHierarchyLevels({
        search: hierSearch.trim() || undefined,
        status: hierStatusFilter !== 'all' ? hierStatusFilter : undefined,
        supervisory: hierSupervisoryFilter !== 'all' ? hierSupervisoryFilter : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setHierarchies(list);
    } catch (err) {
      console.error('Failed to load hierarchy levels:', err);
      setHierError(err.message || 'Failed to load organization hierarchy levels');
    } finally {
      setHierLoading(false);
    }
  };

  const handleOpenAddHierarchy = () => {
    setEditingHier(null);
    setHierFormData(initialHierForm);
    setHierError('');
    setIsHierModalOpen(true);
  };

  const handleOpenEditHierarchy = (hier) => {
    setEditingHier(hier);
    setHierFormData({
      name: hier.name || '',
      code: hier.code || '',
      rank: hier.rank || 3,
      can_supervise: hier.can_supervise !== undefined ? hier.can_supervise : true,
      requires_reporting: hier.requires_reporting !== undefined ? hier.requires_reporting : false,
      badge_color: hier.badge_color || 'purple',
      description: hier.description || '',
      is_active: hier.is_active !== undefined ? hier.is_active : true,
    });
    setHierError('');
    setIsHierModalOpen(true);
  };

  const handleSaveHierarchy = async (e) => {
    e.preventDefault();
    setHierSaving(true);
    setHierError('');

    try {
      if (editingHier) {
        await teamService.updateHierarchyLevel(editingHier._id, hierFormData);
      } else {
        await teamService.createHierarchyLevel(hierFormData);
      }
      setIsHierModalOpen(false);
      loadHierarchies();
    } catch (err) {
      setHierError(err.message || 'Failed to save hierarchy level');
    } finally {
      setHierSaving(false);
    }
  };

  const handleToggleHierStatus = async (hier) => {
    try {
      await teamService.updateHierarchyLevel(hier._id, { is_active: !hier.is_active });
      loadHierarchies();
    } catch (err) {
      alert(err.message || 'Failed to update hierarchy level status');
    }
  };

  const handleDeleteHierarchy = async (hier) => {
    if (!window.confirm(`Are you sure you want to delete hierarchy level "${hier.name}"?`)) {
      return;
    }
    try {
      await teamService.deleteHierarchyLevel(hier._id);
      loadHierarchies();
    } catch (err) {
      alert(err.message || 'Failed to delete hierarchy level');
    }
  };

  const filteredHierarchies = hierarchies.filter((h) => {
    const q = hierSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      h.name?.toLowerCase().includes(q) ||
      h.code?.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q);

    const matchStatus =
      hierStatusFilter === 'all' ||
      (hierStatusFilter === 'active' && h.is_active) ||
      (hierStatusFilter === 'inactive' && !h.is_active);

    const matchSupervisory =
      hierSupervisoryFilter === 'all' ||
      (hierSupervisoryFilter === 'senior' && h.can_supervise) ||
      (hierSupervisoryFilter === 'junior' && h.requires_reporting);

    return matchSearch && matchStatus && matchSupervisory;
  });

  const getHierBadgeClass = (color) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const hierarchyColumns = [
    {
      header: 'Seniority Rank',
      key: 'rank',
      className: 'w-[120px]',
      render: (_, h) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
            {h.rank}
          </span>
          <span className="text-[11px] text-slate-500 font-sans">
            {h.rank === 1 ? 'Top Level' : h.rank <= 3 ? 'Senior' : 'Operational'}
          </span>
        </div>
      ),
    },
    {
      header: 'Hierarchy Level & Code',
      key: 'name',
      render: (_, h) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{h.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {h.code}
            </span>
            {h.is_system && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500">
                System
              </span>
            )}
          </div>
          {h.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{h.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Role Nature / Supervision',
      key: 'can_supervise',
      render: (_, h) => (
        <div className="flex flex-wrap gap-1">
          {h.can_supervise ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Crown className="w-3 h-3 text-amber-600" /> Supervisory / Team Lead
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
              Executive / Member
            </span>
          )}
          {h.requires_reporting && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
              Reports to Supervisor
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Badge Style',
      key: 'badge_color',
      render: (_, h) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getHierBadgeClass(h.badge_color)}`}>
          {h.name}
        </span>
      ),
    },
    {
      header: 'Staff Mapped',
      key: 'member_count',
      render: (_, h) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {h.member_count || 0} Staff
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (_, h) => (
        <StatusBadge
          status={h.is_active ? 'active' : 'inactive'}
          type="status"
          label={h.is_active ? 'Active' : 'Inactive'}
        />
      ),
    },
  ];

  const departmentColumns = [
    {
      header: 'Department Details',
      key: 'name',
      render: (_, d) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{d.name}</span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {d.code}
            </span>
            {d.is_system && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                Core
              </span>
            )}
          </div>
          {d.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{d.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Staff',
      key: 'member_count',
      render: (_, d) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
          <Users className="w-3.5 h-3.5" />
          {d.member_count || 0} Staff
        </span>
      ),
    },
    {
      header: 'Department Head',
      key: 'head_of_department',
      render: (_, d) => (
        <span className="text-xs font-medium text-slate-700">
          {d.head_of_department || <span className="text-slate-400 italic">Not Assigned</span>}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (_, d) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            d.is_active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {d.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  // ======================== TABLE COLUMNS ========================
  const warehouseColumns = [
    {
      header: 'Code & Name',
      key: 'warehouse_name',
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {row.warehouse_code}
            </span>
            <span className="font-bold text-slate-900 text-sm">{val}</span>
            {row.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 capitalize mt-0.5 block">
            Type: {row.warehouse_type || 'Central'} Hub
          </span>
        </div>
      ),
    },
    {
      header: 'Location',
      key: 'address',
      render: (addr) => (
        <div className="text-xs text-slate-700">
          <p className="font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            {addr?.city || 'Gujarat'}{addr?.state ? `, ${addr.state}` : ''}
          </p>
          {addr?.line1 && <p className="text-[11px] text-slate-400 truncate mt-0.5">{addr.line1}</p>}
        </div>
      ),
    },
    {
      header: 'Contact Person',
      key: 'contact_person',
      render: (val, row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            {val || 'Manager'}
          </p>
          {row.mobile && (
            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              {row.mobile}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const categoryColumns = [
    {
      header: 'Category Code',
      key: 'code',
      cellClassName: 'font-mono text-xs font-bold text-slate-900',
      render: (val) => val || '—',
    },
    {
      header: 'Category Name',
      key: 'name',
      render: (val) => <span className="font-bold text-slate-900 text-sm">{val}</span>,
    },
    {
      header: 'Classification (Multiple)',
      key: 'category_types',
      render: (types, row) => {
        const list = Array.isArray(types) && types.length > 0 ? types : ['raw_material', 'finished'];
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {list.includes('raw_material') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Raw Material
              </span>
            )}
            {list.includes('finished') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Finished
              </span>
            )}
            {(list.includes('contractor') || list.includes('manufacturing')) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Contractor
              </span>
            )}
          </div>
        );
      },
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

  const supplierColumns = [
    {
      header: 'Supplier / Contractor',
      key: 'supplier_name',
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {row.supplier_code || 'SUP'}
            </span>
            <span className="font-bold text-slate-900 text-sm">{val}</span>
          </div>
          {row.contact_person && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> {row.contact_person}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Classification (Multiple)',
      key: 'supplier_classifications',
      render: (classes, row) => {
        const list = Array.isArray(classes) && classes.length > 0
          ? classes
          : (row.supplier_classification === 'both'
            ? ['raw_material', 'finished', 'contractor']
            : [row.supplier_classification || 'raw_material']);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
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
      header: 'Categories',
      key: 'categories',
      render: (cats, row) => {
        const list = Array.isArray(cats) && cats.length > 0 ? cats : (row.category ? [row.category] : []);
        return (
          <div className="flex items-center gap-1 flex-wrap max-w-xs">
            {list.slice(0, 3).map((c, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                {typeof c === 'object' ? (c.name || c.code) : c}
              </span>
            ))}
            {list.length > 3 && (
              <span className="text-[10px] text-slate-400 font-mono">+{list.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Contact & GST',
      key: 'mobile',
      render: (val, row) => (
        <div className="text-xs text-slate-700">
          <p className="font-mono font-semibold flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" /> {val || '—'}
          </p>
          {row.gstin && (
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">GST: {row.gstin}</p>
          )}
        </div>
      ),
    },
    {
      header: 'City',
      key: 'address',
      render: (addr) => <span className="text-xs text-slate-700">{addr?.city || 'Gujarat'}</span>,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Settings & Master Configurations"
        subtitle="Manage centralized warehouses, supplier classifications, and global procurement settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase/suppliers' },
          { label: 'Settings' },
        ]}
      />

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'categories'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Supplier Categories</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-bold">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'suppliers'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Suppliers & Contractors</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-brand/10 text-brand font-mono font-bold">
              {suppliers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'warehouses'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Warehouse Management</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-brand font-mono font-bold">
              {warehouses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'departments'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Departments Master</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 font-mono font-bold">
              {departments.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'hierarchy'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Hierarchy & Org Levels</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-mono font-bold">
              {hierarchies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank_accounts')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
              activeTab === 'bank_accounts'
                ? 'border-brand text-brand bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank Accounts</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-mono font-bold">
              {bankAccounts.length}
            </span>
          </button>

        </div>

        {/* Tab 1: Centralized Warehouse Management */}
        {activeTab === 'warehouses' && (
          <div className="p-5 space-y-4">
            {/* Quick Warehouse Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase block">Total Warehouses</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{warehouses.length}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Active Facilities</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">
                    {warehouses.filter((w) => w.status === 'active').length}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-600">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold uppercase block">Default Warehouse</span>
                  <span className="text-xs font-bold text-amber-900 truncate block">
                    {warehouses.find((w) => w.is_default)?.warehouse_name || 'None Set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Centralized Warehouse Master</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized globally across Purchase Orders, Inward Goods Receipts (GRN), Purchase Bills, and Stock Inventory.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search warehouse..."
                    value={whSearch}
                    onChange={(e) => setWhSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none w-44 sm:w-56 bg-slate-50"
                  />
                </div>

                <select
                  value={whStatusFilter}
                  onChange={(e) => setWhStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenAddWarehouse}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Warehouse
                </button>
              </div>
            </div>

            {/* Table */}
            <DataTable
              columns={warehouseColumns}
              data={filteredWarehouses}
              loading={whLoading}
              emptyMessage="No warehouses found. Click 'Add Warehouse' to configure your storage locations."
              actions={(wh) => (
                <div className="flex items-center justify-end gap-1.5">
                  {!wh.is_default && wh.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultWarehouse(wh)}
                      title="Set as Default Warehouse"
                      className="px-2 py-1 text-xs font-semibold rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition inline-flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" /> Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleWarehouseStatus(wh)}
                    title={wh.status === 'active' ? 'Deactivate Warehouse' : 'Activate Warehouse'}
                    className={`px-2 py-1 text-xs font-semibold rounded transition ${
                      wh.status === 'active'
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {wh.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditWarehouse(wh)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Warehouse"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWarehouse(wh)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove Warehouse (Protected against transaction loss)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {/* Tab 2: Supplier Categories */}
        {activeTab === 'categories' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Supplier Categories Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Classify suppliers into specific domains (e.g. Raw Materials, Fabric, Trims, Hardware, Packaging).
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none w-48 sm:w-60 bg-slate-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>
            </div>

            {/* Sub-Tabs: All | Raw Material | Finished | Contractor */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setCatTypeTab('all')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  catTypeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  catTypeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {categories.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCatTypeTab('raw_material')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  catTypeTab === 'raw_material'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Raw Material</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  catTypeTab === 'raw_material' ? 'bg-blue-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {categories.filter((c) => {
                    const t = c.category_types || ['raw_material', 'finished'];
                    return t.includes('raw_material');
                  }).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCatTypeTab('finished')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  catTypeTab === 'finished'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Finished</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  catTypeTab === 'finished' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {categories.filter((c) => {
                    const t = c.category_types || ['raw_material', 'finished'];
                    return t.includes('finished');
                  }).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCatTypeTab('contractor')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  catTypeTab === 'contractor'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Contractor / Job Work</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  catTypeTab === 'contractor' ? 'bg-amber-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {categories.filter((c) => {
                    const t = c.category_types || ['raw_material', 'finished'];
                    return t.includes('contractor') || t.includes('manufacturing');
                  }).length}
                </span>
              </button>
            </div>

            <DataTable
              columns={categoryColumns}
              data={filteredCategories}
              loading={catLoading}
              emptyMessage="No supplier categories created yet. Click 'Add Category' to get started."
              actions={(cat) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleCatActive(cat)}
                    title={cat.is_active ? 'Deactivate Category' : 'Activate Category'}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                      cat.is_active
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {cat.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {/* Tab 3: Suppliers Directory */}
        {activeTab === 'suppliers' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Suppliers & Contractors Master</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage vendors across Raw Material, Finished Goods, and Processing Contractors with multiple classifications.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search supplier, mobile, GST..."
                    value={supSearch}
                    onChange={(e) => setSupSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none w-48 sm:w-60 bg-slate-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSupplier}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Supplier
                </button>
              </div>
            </div>

            {/* Sub-Tabs: All | Raw Material | Finished | Contractor */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setSupTypeTab('all')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  supTypeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  supTypeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {suppliers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSupTypeTab('raw_material')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  supTypeTab === 'raw_material'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Raw Material</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  supTypeTab === 'raw_material' ? 'bg-blue-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {suppliers.filter((s) => {
                    const cl = s.supplier_classifications || [s.supplier_classification];
                    return cl.includes('raw_material') || cl.includes('both');
                  }).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSupTypeTab('finished')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  supTypeTab === 'finished'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Finished</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  supTypeTab === 'finished' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {suppliers.filter((s) => {
                    const cl = s.supplier_classifications || [s.supplier_classification];
                    return cl.includes('finished') || cl.includes('both');
                  }).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSupTypeTab('contractor')}
                className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                  supTypeTab === 'contractor'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Contractor / Job Work</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  supTypeTab === 'contractor' ? 'bg-amber-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {suppliers.filter((s) => {
                    const cl = s.supplier_classifications || [s.supplier_classification];
                    return cl.includes('contractor') || cl.includes('manufacturing') || cl.includes('both');
                  }).length}
                </span>
              </button>
            </div>

            <DataTable
              columns={supplierColumns}
              data={filteredSuppliers}
              loading={supLoading}
              emptyMessage="No suppliers found for this classification."
              actions={(sup) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditSupplier(sup)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {/* Tab 4: Organization Departments Master */}
        {activeTab === 'departments' && (
          <div className="p-5 space-y-4">
            {/* Quick Department Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase block">Total Departments</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{departments.length}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Active Departments</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">
                    {departments.filter((d) => d.is_active).length}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-purple-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-purple-700 font-semibold uppercase block">Total Assigned Staff</span>
                  <span className="text-lg font-bold font-mono text-purple-800">
                    {departments.reduce((acc, d) => acc + (d.member_count || 0), 0)} Members
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="Search departments by name, code..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <select
                  value={deptStatusFilter}
                  onChange={(e) => setDeptStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenAddDepartment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Department
              </button>
            </div>

            {/* Departments Table */}
            <DataTable
              columns={departmentColumns}
              data={filteredDepartments}
              loading={deptLoading}
              emptyMessage="No departments found matching criteria."
              actions={(dept) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleDeptStatus(dept)}
                    className={`p-1.5 rounded-lg transition ${
                      dept.is_active
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={dept.is_active ? 'Deactivate Department' : 'Activate Department'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditDepartment(dept)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Department"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDepartment(dept)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}
        {/* Tab 5: Hierarchy & Organization Levels Management */}
        {activeTab === 'hierarchy' && (
          <div className="p-5 space-y-4">
            {/* Quick Hierarchy Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase block">Total Levels</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{hierarchies.length}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Active Levels</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">
                    {hierarchies.filter((h) => h.is_active).length}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-700">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold uppercase block">Supervisory Levels</span>
                  <span className="text-lg font-bold font-mono text-amber-800">
                    {hierarchies.filter((h) => h.can_supervise).length}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-purple-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-purple-700 font-semibold uppercase block">Staff Assigned</span>
                  <span className="text-lg font-bold font-mono text-purple-800">
                    {hierarchies.reduce((acc, h) => acc + (h.member_count || 0), 0)} Members
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={hierSearch}
                    onChange={(e) => setHierSearch(e.target.value)}
                    placeholder="Search hierarchy by level name, code..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <select
                  value={hierSupervisoryFilter}
                  onChange={(e) => setHierSupervisoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="senior">Supervisory / Team Lead</option>
                  <option value="junior">Requires Reporting</option>
                </select>

                <select
                  value={hierStatusFilter}
                  onChange={(e) => setHierStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenAddHierarchy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Hierarchy Level
              </button>
            </div>

            {/* Hierarchy Table */}
            <DataTable
              columns={hierarchyColumns}
              data={filteredHierarchies}
              loading={hierLoading}
              emptyMessage="No hierarchy levels found matching criteria."
              actions={(hier) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleHierStatus(hier)}
                    className={`p-1.5 rounded-lg transition ${
                      hier.is_active
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={hier.is_active ? 'Deactivate Level' : 'Activate Level'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditHierarchy(hier)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Hierarchy Level"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHierarchy(hier)}
                    disabled={hier.is_system || hier.member_count > 0}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title={
                      hier.is_system
                        ? 'System hierarchy levels cannot be removed'
                        : hier.member_count > 0
                        ? `Cannot delete: ${hier.member_count} staff assigned`
                        : 'Delete Hierarchy Level'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {/* Tab 6: Company Bank Accounts Management */}
        {activeTab === 'bank_accounts' && (
          <div className="p-5 space-y-4">
            {/* Quick Bank Account KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800">Total Company Bank Balance</div>
                  <div className="text-xl font-black font-mono text-emerald-700">
                    ₹{(baSummary?.total_balance || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-emerald-600">Across {bankAccounts.length} Registered Accounts</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand shadow-xs">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Active Accounts</div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {baSummary?.active_accounts || bankAccounts.filter((a) => a.is_active).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Ready for payment transactions</div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-800">Default Receiving (Customer Inflow)</div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {baSummary?.default_receiving?.account_name || 'None Set'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {baSummary?.default_receiving ? `${baSummary.default_receiving.bank_name}` : 'Select a primary receiving account'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-blue-800">Default Paying (Vendor Outflow)</div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {baSummary?.default_payment?.account_name || 'None Set'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {baSummary?.default_payment ? `${baSummary.default_payment.bank_name}` : 'Select a primary paying account'}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters, Search & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={baSearch}
                    onChange={(e) => setBaSearch(e.target.value)}
                    placeholder="Search bank name, A/c no, IFSC, UPI..."
                    className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs w-64 focus:border-brand outline-none"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  {[
                    { id: 'all', label: 'All Types' },
                    { id: 'current', label: 'Current' },
                    { id: 'savings', label: 'Savings' },
                    { id: 'overdraft_cc', label: 'OD / CC' },
                    { id: 'cash', label: 'Cash Vault' },
                    { id: 'upi', label: 'UPI / QR' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBaTypeFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-md font-semibold transition ${
                        baTypeFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddBa}
                  className="px-4 py-2 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-600 transition flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Bank Account
                </button>
              </div>
            </div>

            {/* Bank Accounts DataTable */}
            <DataTable
              loading={baLoading}
              data={filteredBankAccounts}
              emptyMessage="No company bank accounts found. Click '+ Add Bank Account' to create your first account."
              columns={[
                {
                  key: 'account_name',
                  label: 'Account & Bank',
                  render: (val, row) => (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <Landmark className="w-4 h-4 text-brand shrink-0" />
                        <span>{val}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">{row.bank_name}</div>
                      <div className="text-[11px] text-slate-400">A/c Holder: {row.account_holder_name}</div>
                    </div>
                  ),
                },
                {
                  key: 'account_number',
                  label: 'Account Details',
                  render: (val, row) => (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {val}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(val, `acc_${row._id}`)}
                          className="text-slate-400 hover:text-brand transition p-1"
                          title="Copy Account Number"
                        >
                          {copiedField === `acc_${row._id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {row.ifsc_code && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="text-[10px] uppercase font-bold text-slate-400">IFSC:</span>
                          <span className="font-mono font-semibold">{row.ifsc_code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.ifsc_code, `ifsc_${row._id}`)}
                            className="text-slate-400 hover:text-brand transition p-0.5"
                            title="Copy IFSC"
                          >
                            {copiedField === `ifsc_${row._id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                      {row.branch_name && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{row.branch_name}</div>
                      )}
                      {row.upi_id && (
                        <div className="text-[11px] font-mono text-purple-700 font-medium">UPI: {row.upi_id}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'account_type',
                  label: 'Type',
                  render: (val) => {
                    const badgeStyles = {
                      current: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      savings: 'bg-blue-50 text-blue-700 border-blue-200',
                      overdraft_cc: 'bg-purple-50 text-purple-700 border-purple-200',
                      cash: 'bg-amber-50 text-amber-700 border-amber-200',
                      upi: 'bg-pink-50 text-pink-700 border-pink-200',
                    };
                    const labels = {
                      current: 'Current A/c',
                      savings: 'Savings A/c',
                      overdraft_cc: 'Overdraft / CC',
                      cash: 'Cash Vault',
                      upi: 'Corporate UPI',
                    };
                    return (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          badgeStyles[val] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {labels[val] || val}
                      </span>
                    );
                  },
                },
                {
                  key: 'current_balance',
                  label: 'Current Balance',
                  render: (val, row) => (
                    <div>
                      <div
                        className={`font-mono font-black text-sm ${
                          val < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        ₹{(Number(val) || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Opening: ₹{(Number(row.opening_balance) || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'defaults',
                  label: 'Default Status',
                  render: (_, row) => (
                    <div className="space-y-1">
                      {row.is_default_receiving ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Receiving Default</span>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleSetDefaultReceiving(row)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 text-slate-400" />
                            Set as Receiving Default
                          </button>
                        </div>
                      )}

                      {row.is_default_payment ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Paying Default</span>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleSetDefaultPayment(row)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 hover:underline flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 text-slate-400" />
                            Set as Paying Default
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  render: (val) => (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        val
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {val ? 'Active' : 'Inactive'}
                    </span>
                  ),
                },
              ]}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleBaStatus(row)}
                    className={`p-1.5 rounded-lg transition ${
                      row.is_active
                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={row.is_active ? 'Deactivate Account' : 'Activate Account'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditBa(row)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Bank Account"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBa(row)}
                    disabled={row.is_default_receiving || row.is_default_payment}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title={
                      row.is_default_receiving || row.is_default_payment
                        ? 'Default bank account cannot be deleted'
                        : 'Delete Bank Account'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}

      </div>

      {/* ADD / EDIT WAREHOUSE MODAL */}
      <Modal
        isOpen={isWhModalOpen}
        onClose={() => setIsWhModalOpen(false)}
        title={editingWh ? `Edit Warehouse: ${editingWh.warehouse_name}` : 'Add New Storage Warehouse'}
        size="lg"
      >
        <form onSubmit={handleSaveWarehouse} className="space-y-4 text-xs font-sans text-slate-800">
          {whError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{whError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Warehouse Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={whFormData.warehouse_name}
                onChange={(e) => setWhFormData({ ...whFormData, warehouse_name: e.target.value })}
                placeholder="e.g. Ahmedabad Central Hub"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Warehouse Code (Unique) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={whFormData.warehouse_code}
                onChange={(e) =>
                  setWhFormData({ ...whFormData, warehouse_code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. WH-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:border-brand outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Facility Type</label>
              <select
                value={whFormData.warehouse_type}
                onChange={(e) => setWhFormData({ ...whFormData, warehouse_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
              >
                <option value="central">Central Storage Hub</option>
                <option value="regional">Regional Distribution Depot</option>
                <option value="retail">Retail Storefront Stockroom</option>
                <option value="transit">Transit Facility</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                value={whFormData.address.city}
                onChange={(e) =>
                  setWhFormData({
                    ...whFormData,
                    address: { ...whFormData.address, city: e.target.value },
                  })
                }
                placeholder="e.g. Ahmedabad"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={whFormData.contact_person}
                onChange={(e) => setWhFormData({ ...whFormData, contact_person: e.target.value })}
                placeholder="e.g. Suresh Patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={whFormData.mobile}
                onChange={(e) => setWhFormData({ ...whFormData, mobile: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-brand outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Address Line</label>
            <input
              type="text"
              value={whFormData.address.line1}
              onChange={(e) =>
                setWhFormData({
                  ...whFormData,
                  address: { ...whFormData.address, line1: e.target.value },
                })
              }
              placeholder="Plot No., Industrial Area, Street..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={whFormData.description}
              onChange={(e) => setWhFormData({ ...whFormData, description: e.target.value })}
              placeholder="Optional remarks about warehouse capacity or operations..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whFormData.is_default}
                onChange={(e) => setWhFormData({ ...whFormData, is_default: e.target.checked })}
                className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
              />
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Set as Default Warehouse
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whFormData.status === 'active'}
                onChange={(e) =>
                  setWhFormData({ ...whFormData, status: e.target.checked ? 'active' : 'inactive' })
                }
                className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
              />
              <span className="font-semibold text-slate-700 text-xs">Active Facility</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWhModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={whSaving}
              className="px-5 py-2 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
            >
              {whSaving ? 'Saving Warehouse...' : editingWh ? 'Update Warehouse' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT CATEGORY MODAL */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Supplier Category'}
        size="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-sm">
          {catError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{catError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={catFormData.name}
              onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
              placeholder="e.g. Fabric & Textiles"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Category Code</label>
            <input
              type="text"
              value={catFormData.code}
              onChange={(e) =>
                setCatFormData({ ...catFormData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g. FABRIC"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Applicable Classification / Type (Multi-select) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1.5">
              {[
                { id: 'raw_material', label: 'Raw Material', desc: 'Raw Material (Fabric, Trims)', color: 'blue' },
                { id: 'finished', label: 'Finished Product', desc: 'Finished Goods (Ready Garments)', color: 'emerald' },
                { id: 'contractor', label: 'Contractor / Job Work', desc: 'Job Work / Processing', color: 'amber' },
              ].map((item) => {
                const isSelected = (catFormData.category_types || []).includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const current = catFormData.category_types || [];
                      const updated = isSelected
                        ? current.filter((x) => x !== item.id)
                        : [...current, item.id];
                      setCatFormData({ ...catFormData, category_types: updated });
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

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Description</label>
            <textarea
              rows={3}
              value={catFormData.description}
              onChange={(e) =>
                setCatFormData({ ...catFormData, description: e.target.value })
              }
              placeholder="Brief details regarding this category classification..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="cat_is_active"
              checked={catFormData.is_active}
              onChange={(e) =>
                setCatFormData({ ...catFormData, is_active: e.target.checked })
              }
              className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
            />
            <label
              htmlFor="cat_is_active"
              className="font-semibold text-slate-700 cursor-pointer text-sm"
            >
              Active Category
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={catSaving}
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {catSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingCategory ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT SUPPLIER MODAL */}
      <Modal
        isOpen={isSupModalOpen}
        onClose={() => setIsSupModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_name}` : 'Add Supplier / Contractor'}
        size="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 text-sm">
          {supError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{supError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Supplier / Contractor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={supFormData.supplier_name}
                onChange={(e) => setSupFormData({ ...supFormData, supplier_name: e.target.value })}
                placeholder="e.g. Apex Textiles / Vardhman Mills"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Supplier Code</label>
              <input
                type="text"
                value={supFormData.supplier_code}
                onChange={(e) => setSupFormData({ ...supFormData, supplier_code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUP-001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Supplier Classification / Type (Multi-select) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1.5">
              {[
                { id: 'raw_material', label: 'Raw Material Supplier', desc: 'Raw Material (Fabric, Trims)', color: 'blue' },
                { id: 'finished', label: 'Finished Product Supplier', desc: 'Finished Goods (Ready Garments)', color: 'emerald' },
                { id: 'contractor', label: 'Contractor / Job Worker', desc: 'Job Work / Processing Contractor', color: 'amber' },
              ].map((item) => {
                const isSelected = (supFormData.supplier_classifications || []).includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const current = supFormData.supplier_classifications || [];
                      const updated = isSelected
                        ? current.filter((x) => x !== item.id)
                        : [...current, item.id];
                      setSupFormData({ ...supFormData, supplier_classifications: updated });
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Contact Person</label>
              <input
                type="text"
                value={supFormData.contact_person}
                onChange={(e) => setSupFormData({ ...supFormData, contact_person: e.target.value })}
                placeholder="Manager / Owner name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Mobile Number</label>
              <input
                type="text"
                value={supFormData.mobile}
                onChange={(e) => setSupFormData({ ...supFormData, mobile: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Email Address</label>
              <input
                type="email"
                value={supFormData.email}
                onChange={(e) => setSupFormData({ ...supFormData, email: e.target.value })}
                placeholder="vendor@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">GSTIN Number</label>
              <input
                type="text"
                value={supFormData.gstin}
                onChange={(e) => setSupFormData({ ...supFormData, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAACA1234F1Z8"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Assigned Categories <span className="text-xs font-normal text-slate-500">(Multiple Selectable)</span>
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 min-h-[46px]">
              {[{ code: 'raw_materials', name: 'Raw Materials' }, ...categories].map((c) => {
                const val = c.code || c.name;
                const label = c.name || c.code;
                const isSelected = (supFormData.categories || []).includes(val);
                return (
                  <button
                    type="button"
                    key={val}
                    onClick={() => {
                      const current = supFormData.categories || [];
                      const updated = isSelected
                        ? current.filter((x) => x !== val)
                        : [...current, val];
                      setSupFormData({
                        ...supFormData,
                        categories: updated.length > 0 ? updated : [val],
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">City</label>
              <input
                type="text"
                value={supFormData.address?.city || ''}
                onChange={(e) =>
                  setSupFormData({
                    ...supFormData,
                    address: { ...supFormData.address, city: e.target.value },
                  })
                }
                placeholder="Ahmedabad, Surat, Mumbai..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">State</label>
              <input
                type="text"
                value={supFormData.address?.state || ''}
                onChange={(e) =>
                  setSupFormData({
                    ...supFormData,
                    address: { ...supFormData.address, state: e.target.value },
                  })
                }
                placeholder="Gujarat"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSupModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={supSaving}
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {supSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT DEPARTMENT MODAL */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Add New Organization Department'}
        size="md"
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs font-sans text-slate-800">
          {deptError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deptError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Department Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={deptFormData.name}
                onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                placeholder="e.g. Quality Assurance & Inspection"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Department Code (Unique) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptFormData.code}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. QA"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Head / Lead</label>
                <input
                  type="text"
                  value={deptFormData.head_of_department}
                  onChange={(e) => setDeptFormData({ ...deptFormData, head_of_department: e.target.value })}
                  placeholder="e.g. Nilesh Patel"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description / Responsibilities</label>
              <textarea
                rows={3}
                value={deptFormData.description}
                onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                placeholder="Briefly describe what this department oversees..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="dept_is_active"
                checked={deptFormData.is_active}
                onChange={(e) => setDeptFormData({ ...deptFormData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
              />
              <label htmlFor="dept_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Active Department (available for staff assignment in Team Member module)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deptSaving}
              className="px-4 py-2 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {deptSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingDept ? 'Update Department' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>
      {/* ======================== MODAL: ADD / EDIT HIERARCHY LEVEL ======================== */}
      <Modal
        isOpen={isHierModalOpen}
        onClose={() => setIsHierModalOpen(false)}
        title={editingHier ? `Edit Hierarchy Level: ${editingHier.name}` : 'Add New Hierarchy Level'}
        subtitle="Configure organizational seniority ranks, supervision capabilities, and visual badges used across Team Management."
        size="md"
      >
        <form onSubmit={handleSaveHierarchy} className="space-y-4 text-xs font-sans text-slate-800">
          {hierError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{hierError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hierarchy Level Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={hierFormData.name}
                onChange={(e) => setHierFormData({ ...hierFormData, name: e.target.value })}
                placeholder="e.g. Senior Team Lead / Assistant Manager"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Code (Unique) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hierFormData.code}
                  onChange={(e) => setHierFormData({ ...hierFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SR_LEAD"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Seniority Rank (1-10) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={hierFormData.rank}
                  onChange={(e) => setHierFormData({ ...hierFormData, rank: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:border-brand outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">1 = Highest / Executive, 5 = Junior</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hier_can_supervise"
                    checked={hierFormData.can_supervise}
                    onChange={(e) => setHierFormData({ ...hierFormData, can_supervise: e.target.checked })}
                    className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                  />
                  <label htmlFor="hier_can_supervise" className="font-bold text-slate-800 cursor-pointer">
                    Can Supervise (Team Lead)
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Staff at this level can be chosen as a "Reports To" supervisor for junior members.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hier_requires_reporting"
                    checked={hierFormData.requires_reporting}
                    onChange={(e) => setHierFormData({ ...hierFormData, requires_reporting: e.target.checked })}
                    className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                  />
                  <label htmlFor="hier_requires_reporting" className="font-bold text-slate-800 cursor-pointer">
                    Requires Reporting
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Staff at this level must select a supervisor in the Team Member form.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Badge Color Theme</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'purple', name: 'Purple', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
                  { id: 'blue', name: 'Blue', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
                  { id: 'amber', name: 'Amber', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
                  { id: 'rose', name: 'Rose', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
                  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                  { id: 'slate', name: 'Slate', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
                ].map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setHierFormData({ ...hierFormData, badge_color: color.id })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${color.bg} ${
                      hierFormData.badge_color === color.id
                        ? 'ring-2 ring-brand ring-offset-1 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description / Scope</label>
              <textarea
                rows={2}
                value={hierFormData.description}
                onChange={(e) => setHierFormData({ ...hierFormData, description: e.target.value })}
                placeholder="Briefly describe responsibilities, supervisory authority or scope..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="hier_is_active"
                checked={hierFormData.is_active}
                onChange={(e) => setHierFormData({ ...hierFormData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
              />
              <label htmlFor="hier_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Active Level (available in Team Member hierarchy dropdowns across the ERP)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHierModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={hierSaving}
              className="px-4 py-2 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {hierSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingHier ? 'Update Hierarchy Level' : 'Save Hierarchy Level'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================== MODAL: ADD / EDIT BANK ACCOUNT ======================== */}
      <Modal
        isOpen={isBaModalOpen}
        onClose={() => setIsBaModalOpen(false)}
        title={editingBa ? `Edit Bank Account: ${editingBa.account_name}` : 'Add Company Bank Account'}
        subtitle="Manage Danza-Son operational current accounts, OD credit limits, factory cash vaults and UPI handles used across Sales Receipts & Vendor Disbursements."
        size="lg"
      >
        <form onSubmit={handleSaveBa} className="space-y-4 text-xs font-sans text-slate-800">
          {baError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{baError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={baFormData.account_name}
                onChange={(e) => setBaFormData({ ...baFormData, account_name: e.target.value })}
                placeholder="e.g. HDFC Bank Main Current A/c"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bank / Institution Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={baFormData.bank_name}
                onChange={(e) => setBaFormData({ ...baFormData, bank_name: e.target.value })}
                placeholder="e.g. HDFC Bank Ltd or State Bank of India"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={baFormData.account_type}
                onChange={(e) => setBaFormData({ ...baFormData, account_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
              >
                <option value="current">Current Account (Operating Account)</option>
                <option value="savings">Savings Account (Reserve Account)</option>
                <option value="overdraft_cc">Cash Credit / Overdraft (CC / OD Limit)</option>
                <option value="cash">Cash Vault / Petty Cash (Cash Drawer)</option>
                <option value="upi">Corporate UPI / Payment Gateway Wallet</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={baFormData.account_number}
                onChange={(e) => setBaFormData({ ...baFormData, account_number: e.target.value })}
                placeholder="e.g. 50200018892144 or CASH-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={baFormData.account_holder_name}
                onChange={(e) => setBaFormData({ ...baFormData, account_holder_name: e.target.value })}
                placeholder="Danza-Son Apparels & Textiles"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC Code (for NEFT/RTGS/IMPS)</label>
              <input
                type="text"
                value={baFormData.ifsc_code}
                onChange={(e) => setBaFormData({ ...baFormData, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="e.g. HDFC0000240"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Name / Location</label>
              <input
                type="text"
                value={baFormData.branch_name}
                onChange={(e) => setBaFormData({ ...baFormData, branch_name: e.target.value })}
                placeholder="e.g. Ring Road Textile Market Branch, Surat"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">UPI ID / VPA (Optional)</label>
              <input
                type="text"
                value={baFormData.upi_id}
                onChange={(e) => setBaFormData({ ...baFormData, upi_id: e.target.value })}
                placeholder="e.g. danzason@okhdfcbank"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={baFormData.opening_balance}
                onChange={(e) => setBaFormData({ ...baFormData, opening_balance: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:border-brand outline-none bg-white"
              />
              <span className="text-[10px] text-slate-400">Balance at the start of book keeping</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={baFormData.current_balance}
                onChange={(e) => setBaFormData({ ...baFormData, current_balance: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:border-brand outline-none bg-white"
              />
              <span className="text-[10px] text-slate-400">Auto-adjusted as receipts and payments are recorded</span>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-700">Default Payment Behavior Settings:</div>
            
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="ba_default_receiving"
                checked={baFormData.is_default_receiving}
                onChange={(e) => setBaFormData({ ...baFormData, is_default_receiving: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="ba_default_receiving" className="text-xs cursor-pointer">
                <span className="font-bold text-emerald-800">Set as Primary Receiving Account (Customer Receipts)</span>
                <span className="block text-slate-500 text-[11px]">
                  When recording incoming payment from customer sales invoices, this account will be automatically pre-selected.
                </span>
              </label>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="ba_default_payment"
                checked={baFormData.is_default_payment}
                onChange={(e) => setBaFormData({ ...baFormData, is_default_payment: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="ba_default_payment" className="text-xs cursor-pointer">
                <span className="font-bold text-blue-800">Set as Primary Paying Account (Vendor Disbursements)</span>
                <span className="block text-slate-500 text-[11px]">
                  When recording outgoing payment for purchase bills to suppliers/contractors, this account will be automatically pre-selected.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
              <input
                type="checkbox"
                id="ba_is_active"
                checked={baFormData.is_active}
                onChange={(e) => setBaFormData({ ...baFormData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
              />
              <label htmlFor="ba_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Active Account (visible in payment recording dialogs across the ERP)
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
            <textarea
              rows={2}
              value={baFormData.notes}
              onChange={(e) => setBaFormData({ ...baFormData, notes: e.target.value })}
              placeholder="e.g. Primary bank for Surat textile trade receipts, RTGS limits, etc."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBaModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={baSaving}
              className="px-4 py-2 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
            >
              {baSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingBa ? 'Update Bank Account' : 'Save Bank Account'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
