import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import QuickPeekDrawer from './QuickPeekDrawer';
import ErrorBoundary from '../common/ErrorBoundary';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickPeekOpen, setQuickPeekOpen] = useState(false);

  // Global keyboard shortcut (Ctrl+K or Cmd+K) to toggle Quick-Peek HUD
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickPeekOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/60 flex antialiased">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenQuickPeek={() => setQuickPeekOpen(true)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenQuickPeek={() => setQuickPeekOpen(true)}
        />
        <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6 w-full space-y-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Unique Quick-Peek HUD Drawer */}
      <QuickPeekDrawer
        isOpen={quickPeekOpen}
        onClose={() => setQuickPeekOpen(false)}
      />
    </div>
  );
}
