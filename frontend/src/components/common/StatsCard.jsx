import React from 'react';

export default function StatsCard({ title, value, icon: Icon, description }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-soft-lg transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
          {title}
        </p>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value || 0}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
