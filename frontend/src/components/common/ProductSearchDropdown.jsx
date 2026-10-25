import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Lock, Check } from 'lucide-react';

/**
 * Enterprise-grade clean searchable Product Dropdown for ERP invoice tables.
 * Fits neatly into table cells without row distortion.
 * Keyboard controls: ArrowUp, ArrowDown, Enter, Escape.
 */
export default function ProductSearchDropdown({
  products = [],
  selectedProduct = null,
  selectedProductId = '',
  value = '',
  onSelectProduct,
  onSelect,
  onClear,
  placeholder = 'Select / Search Product...',
  disabled = false,
  error = '',
  loading = false,
  pricingTier = 'B2B',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const activeProduct = useMemo(() => {
    if (selectedProduct && typeof selectedProduct === 'object') return selectedProduct;
    const targetId =
      selectedProductId || value || (typeof selectedProduct === 'string' ? selectedProduct : null);
    if (!targetId) return null;
    return (
      (Array.isArray(products) ? products : []).find(
        (p) => (p._id || '').toString() === targetId.toString()
      ) || null
    );
  }, [products, selectedProduct, selectedProductId, value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products.slice(0, 50);
    const term = searchTerm.toLowerCase().trim();
    return products
      .filter((p) => {
        const name = (p.product_name || p.title || '').toLowerCase();
        const sku = (p.sku || p.sku_id || p.product_code || '').toLowerCase();
        const color = (p.color || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        return (
          name.includes(term) ||
          sku.includes(term) ||
          color.includes(term) ||
          category.includes(term)
        );
      })
      .slice(0, 50);
  }, [products, searchTerm]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (prod) => {
    if (onSelectProduct) {
      onSelectProduct(prod);
    }
    if (onSelect) {
      onSelect(prod);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 1. Trigger Box (Fits cleanly into Table Cell) */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer select-none transition ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-brand ring-1 ring-brand/20 bg-white shadow-xs'
            : activeProduct
            ? 'border-slate-300 bg-white hover:border-brand shadow-2xs'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {activeProduct ? (
            <div className="leading-tight">
              <p className="font-bold text-slate-900 truncate">
                {activeProduct.product_name || activeProduct.title || activeProduct.name}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono truncate mt-0.5">
                <span>SKU: {activeProduct.sku || activeProduct.sku_id || activeProduct.product_code || 'N/A'}</span>
                {activeProduct.color && <span>• {activeProduct.color}</span>}
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  pricingTier === 'B2C'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {pricingTier}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 rounded transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-brand' : ''
            }`}
          />
        </div>
      </div>

      {/* 2. Floating Dropdown Menu (Z-index high, compact, elegant) */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-100 text-xs"
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/90">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type product name, SKU or color..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-brand bg-white"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Product Items List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic text-xs">
                No products found matching &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected =
                  selectedProduct &&
                  ((selectedProduct.product_id || selectedProduct._id || selectedProduct.id) ===
                    (p.product_id || p._id || p.id));
                const b2b = Number(p.b2b_price ?? p.selling_rate ?? p.price ?? 0);
                const b2c = Number(p.b2c_price ?? p.mrp ?? (b2b > 0 ? Math.round(b2b * 1.35) : 0));
                const activePrice = pricingTier === 'B2C' ? b2c : b2b;

                return (
                  <div
                    key={p._id || p.id || idx}
                    data-index={idx}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 ${
                      isHighlighted
                        ? 'bg-emerald-50 text-brand font-medium'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{p.product_name || p.title}</span>
                        {p.color && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                            {p.color}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="uppercase font-semibold">
                          SKU: {p.sku || p.sku_id || 'N/A'}
                        </span>
                        <span>• {p.uom || 'PCS'}</span>
                        {p.gst_rate !== undefined && (
                          <span className="text-emerald-700 font-semibold">
                            GST {p.gst_rate}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 font-mono text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            pricingTier === 'B2B'
                              ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          B2B: ₹{b2b.toFixed(0)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            pricingTier === 'B2C'
                              ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          B2C: ₹{b2c.toFixed(0)}
                        </span>
                      </div>
                      <p className="font-extrabold font-mono text-slate-900 text-xs mt-0.5">
                        ₹{activePrice.toFixed(2)}
                      </p>
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
