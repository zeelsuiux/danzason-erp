import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;

  const st = String(status).toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200/90';
  let dotColor = 'bg-slate-500';

  if (['active', 'approved', 'completed', 'posted', 'paid', 'passed', 'accepted', 'confirmed'].includes(st)) {
    colorClasses = 'bg-emerald-50/90 text-emerald-800 border-emerald-200/90';
    dotColor = 'bg-emerald-600';
  } else if (['pending', 'draft', 'submitted', 'partially_received', 'open', 'unpaid'].includes(st)) {
    colorClasses = 'bg-amber-50/90 text-amber-800 border-amber-200/90';
    dotColor = 'bg-amber-600';
  } else if (['processing', 'in_progress'].includes(st)) {
    colorClasses = 'bg-blue-50/90 text-blue-800 border-blue-200/90';
    dotColor = 'bg-blue-600';
  } else if (['cancelled', 'rejected', 'failed', 'inactive', 'blacklisted'].includes(st)) {
    colorClasses = 'bg-rose-50/90 text-rose-800 border-rose-200/90';
    dotColor = 'bg-rose-600';
  } else if (['sent', 'received', 'awarded', 'partially_paid'].includes(st)) {
    colorClasses = 'bg-indigo-50/90 text-indigo-800 border-indigo-200/90';
    dotColor = 'bg-indigo-600';
  }

  const formatText = st.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase transition-all shadow-2xs ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{formatText}</span>
    </span>
  );
}
