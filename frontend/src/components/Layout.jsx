/**
 * Layout — Sidebar navigation
 * Added: Trash, Change Password menu items
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, FileText, BarChart3,
  Trash2, Lock, LogOut, ChevronRight, Menu, X, Church,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/poj-logo.png';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',         icon: LayoutDashboard, exact: true },
  { to: '/families',  label: 'Family Management', icon: Users },
  { to: '/believers', label: 'Believers',         icon: UserCheck },
  { to: '/reports',   label: 'Reports',           icon: FileText },
  { to: '/analytics', label: 'Analytics',         icon: BarChart3 },
];

const BOTTOM_ITEMS = [
  { to: '/trash',           label: 'Trash',           icon: Trash2 },
  { to: '/change-password', label: 'Change Password',  icon: Lock },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, label, icon: Icon, exact }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-red-800 text-white shadow-md'
            : 'text-red-100/80 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
      <span>{label}</span>
    </NavLink>
  );

  const Sidebar = () => (
    <aside className="h-full flex flex-col bg-gradient-to-b from-red-900 to-red-950">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
  <img 
    src={logo} 
    alt="Presence of Jesus Church Logo"
    className="w-10 h-10 object-contain"
  />
  <div>
    <p className="text-white font-bold text-sm leading-tight">
      Presence of Jesus
    </p>
    <p className="text-red-300 text-xs">
      Church
    </p>
  </div>
</div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest px-4 mb-2">Main</p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="border-t border-white/10 my-4" />

        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest px-4 mb-2">Admin</p>
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 mb-2">
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.username || 'Admin'}</p>
            <p className="text-red-300 text-xs capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-56 lg:w-60 flex-shrink-0 flex-col h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-60 z-50 flex flex-col md:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-red-900 shadow-md">
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-white font-bold text-sm">Presence of Jesus Church</p>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}