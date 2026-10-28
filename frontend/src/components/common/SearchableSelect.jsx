import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check, Loader2 } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search by name, code...',
  emptyMessage = 'No matching options found',
  className = '',
  disabled = false,
  allowClear = false,
  formatOption = null,
  loading = false,
  isMulti = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      setHighlightedIndex(0);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const labelMatch = opt.label?.toString().toLowerCase().includes(term);
    const subMatch = opt.subLabel?.toString().toLowerCase().includes(term);
    const valMatch = opt.value?.toString().toLowerCase().includes(term);
    const codeMatch = opt.code?.toString().toLowerCase().includes(term);
    return labelMatch || subMatch || valMatch || codeMatch;
  });

  // Keep highlighted index in bounds
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightedIndex]);

  const isValueSelected = (optVal) => {
    if (value === null || value === undefined || value === '') return false;
    if (isMulti) {
      return Array.isArray(value) && value.some((v) => String(v) === String(optVal));
    }
    return String(value) === String(optVal);
  };

  const handleSelect = (optVal) => {
    if (isMulti) {
      const currentList = Array.isArray(value) ? [...value] : [];
      const exists = currentList.some((v) => String(v) === String(optVal));
      if (exists) {
        onChange(currentList.filter((v) => String(v) !== String(optVal)));
      } else {
        onChange([...currentList, optVal]);
      }
    } else {
      onChange(optVal);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (isMulti) {
      onChange([]);
    } else {
      onChange('');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectedOption =
    !isMulti && value !== null && value !== undefined && value !== ''
      ? options.find((opt) => String(opt.value) === String(value))
      : null;
  const selectedMultiOptions = isMulti && Array.isArray(value)
    ? options.filter((opt) => value.some((v) => String(v) === String(opt.value)))
    : [];

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} onKeyDown={handleKeyDown}>
      {/* Selected Box / Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition outline-none ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-white'
            : 'border-slate-300 bg-white hover:border-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Loading options...</span>
            </div>
          ) : isMulti ? (
            selectedMultiOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedMultiOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                  >
                    <span>{opt.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                      className="hover:text-emerald-950"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 text-sm">{placeholder}</span>
            )
          ) : selectedOption ? (
            formatOption ? (
              formatOption(selectedOption)
            ) : (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium text-slate-900 text-sm truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.subLabel && (
                  <span className="text-xs text-slate-400 font-mono truncate">
                    ({selectedOption.subLabel})
                  </span>
                )}
              </div>
            )
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && !disabled && ((!isMulti && selectedOption) || (isMulti && selectedMultiOptions.length > 0)) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 bg-white text-slate-800"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50 scrollbar-thin">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading options...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = isValueSelected(opt.value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm">{opt.label}</p>
                      {opt.subLabel && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                          {opt.subLabel}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
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
