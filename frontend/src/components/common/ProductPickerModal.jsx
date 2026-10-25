import React, { useState, useMemo } from 'react';
import { 
  Search, X, Check, Package, Sparkles, Filter, Tag, Layers, ArrowRight 
} from 'lucide-react';
import Modal from './Modal';

export default function ProductPickerModal({
  isOpen,
  onClose,
  onSelectProduct,
  products = [],
  selectedProductId = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const cat = p.category || (p.category_id && p.category_id.name);
      if (cat) set.add(String(cat).toUpperCase());
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filter products by search & category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const cat = (p.category || (p.category_id && p.category_id.name) || '').toUpperCase();
        if (cat !== selectedCategory) return false;
      }

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const nameMatch = (p.product_name || p.title || '').toLowerCase().includes(term);
      const colorMatch = (p.color || '').toLowerCase().includes(term);
      const skuMatch = (p.sku || p.sku_id || p.product_code || '').toLowerCase().includes(term);
      const catMatch = (p.category || '').toLowerCase().includes(term);

      return nameMatch || colorMatch || skuMatch || catMatch;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleSelect = (prod) => {
    onSelectProduct(prod);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Product from Inventory"
      size="xl"
    >
      <div className="space-y-4">
        {/* Search Bar & Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search product name, color, style, SKU (e.g. Titan, Sage, Navy, Co-ord)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
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

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Total Available: <span className="font-bold text-slate-800">{filteredProducts.length}</span> items
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products List Grid */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-inner">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No matching products found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with a different keyword or color name.
              </p>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const prodId = prod.product_id || prod._id;
              const isSelected = selectedProductId && (selectedProductId === prodId || selectedProductId === prod._id);
              const price = Number(prod.selling_rate || prod.price || prod.purchase_rate || 0);

              return (
                <div
                  key={prod._id || prod.id}
                  onClick={() => handleSelect(prod)}
                  className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition hover:bg-slate-50 ${
                    isSelected ? 'bg-emerald-50/70' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Image / Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                      {prod.color_code && (
                        <span
                          className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: prod.color_code }}
                          title={prod.color}
                        />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {prod.product_name || prod.title}
                        </h4>
                        {prod.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {prod.category}
                          </span>
                        )}
                        {prod.color && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {prod.color}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                        {prod.sku && <span>SKU: {prod.sku}</span>}
                        {prod.current_stock !== undefined && (
                          <span className={`font-semibold ${
                            prod.current_stock > 10 ? 'text-slate-600' : prod.current_stock > 0 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            Stock: {prod.current_stock} pcs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Select Button */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 block font-mono">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      {prod.mrp && prod.mrp > price && (
                        <span className="text-[10px] text-slate-400 line-through block font-mono">
                          ₹{Number(prod.mrp).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(prod);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Selected
                        </>
                      ) : (
                        <>
                          <span>Select</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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
