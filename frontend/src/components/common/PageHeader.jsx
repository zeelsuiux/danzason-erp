import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions = null, children = null }) {
  const actionContent = actions || children;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/80">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Link
              to="/"
              className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded"
              title="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-emerald-700 transition-colors text-slate-500 font-semibold"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-800 font-bold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actionContent && <div className="flex items-center gap-2.5 shrink-0">{actionContent}</div>}
    </div>
  );
}
