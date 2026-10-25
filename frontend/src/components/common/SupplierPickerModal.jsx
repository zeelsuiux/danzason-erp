import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check, Building, Phone, Mail, MapPin, Tag, Users, ArrowRight } from 'lucide-react';
import Modal from './Modal';

export default function SupplierPickerModal({
  isOpen,
  onClose,
  onSelectSupplier,
  suppliers = [],
  selectedSupplierId = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset search term when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter suppliers dynamically by Name, Company, Mobile, GSTIN, City, and Type
  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter((sup) => {
      // Type filter
      if (selectedType !== 'ALL') {
        const sType = (sup.supplier_type || 'B2B').toUpperCase();
        if (sType !== selectedType) return false;
      }

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();

      const nameMatch = (sup.supplier_name || '').toLowerCase().includes(term);
      const companyMatch = (sup.company_name || '').toLowerCase().includes(term);
      const codeMatch = (sup.supplier_code || '').toLowerCase().includes(term);
      const contactMatch = (sup.contact_person || '').toLowerCase().includes(term);
      const mobileMatch = (sup.mobile || sup.phone || '').toLowerCase().includes(term);
      const gstinMatch = (sup.gstin || '').toLowerCase().includes(term);
      const cityMatch = (sup.address?.city || '').toLowerCase().includes(term);
      const stateMatch = (sup.address?.state || '').toLowerCase().includes(term);

      return (
        nameMatch ||
        companyMatch ||
        codeMatch ||
        contactMatch ||
        mobileMatch ||
        gstinMatch ||
        cityMatch ||
        stateMatch
      );
    });
  }, [suppliers, searchTerm, selectedType]);

  // Keyboard navigation support
  const handleKeyDown = (e) => {
    if (filteredSuppliers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredSuppliers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredSuppliers.length) % filteredSuppliers.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredSuppliers[selectedIndex];
      if (chosen) {
        handleSelect(chosen);
      }
    }
  };

  const handleSelect = (sup) => {
    onSelectSupplier(sup);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Find & Select Supplier"
      size="xl"
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Search Bar & Type Filters */}
        <div className="space-y-2.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search by supplier name, company, mobile, GSTIN, or city (e.g. Shree, Surat, 98250)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1">Filter Type:</span>
            {['ALL', 'B2B', 'B2C', 'D2C'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSelectedType(t);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedType === t
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400 font-mono">
              Found: <strong className="text-slate-700">{filteredSuppliers.length}</strong> suppliers
            </span>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
          {filteredSuppliers.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Building className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Suppliers Found</p>
              <p className="text-xs text-slate-400 mt-1">
                No matching records for "{searchTerm}". Check the spelling or clear the filter.
              </p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-xs font-bold text-brand hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            filteredSuppliers.map((sup, idx) => {
              const isSelected =
                String(selectedSupplierId) === String(sup._id) || selectedIndex === idx;
              const isCurrentValue = String(selectedSupplierId) === String(sup._id);

              return (
                <div
                  key={sup._id}
                  onClick={() => handleSelect(sup)}
                  className={`pt-2 p-3 rounded-xl border cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-brand bg-emerald-50/60 shadow-2xs'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-brand shrink-0" />
                        <span>{sup.supplier_name}</span>
                      </p>
                      <span className="px-1.5 py-0.2 rounded font-mono font-medium text-[10px] bg-slate-100 text-slate-600">
                        {sup.supplier_code}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {sup.supplier_type || 'B2B'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {sup.contact_person && (
                        <span>Contact: <strong className="text-slate-700">{sup.contact_person}</strong></span>
                      )}
                      {(sup.mobile || sup.phone) && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {sup.mobile || sup.phone}
                        </span>
                      )}
                      {sup.gstin && (
                        <span className="font-mono text-slate-600">GST: {sup.gstin}</span>
                      )}
                      {sup.address?.city && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {sup.address.city}, {sup.address.state || 'Gujarat'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Pending Bal</span>
                      <span className="text-xs font-bold font-mono text-slate-800">
                        ₹{Number(sup.pending_balance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(sup);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        isCurrentValue
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isCurrentValue ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Selected
                        </>
                      ) : (
                        <>
                          Select <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
