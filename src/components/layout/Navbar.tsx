import React, { useState } from 'react';
import {
  Calendar,
  Database,
  UserCheck,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  Shield,
  Briefcase,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import { Badge } from '../common/Badge';

interface NavbarProps {
  onOpenSupabaseGuide: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSupabaseGuide, onOpenMobileMenu }) => {
  const { currentUser, currentRole, switchRole, logout } = useAuth();
  const { activeMonth, setActiveMonth } = useData();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    admin: { label: 'Admin (Full)', icon: <Shield className="w-3.5 h-3.5" />, color: 'purple' },
    kepala: { label: 'Kepala Terapi', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'blue' },
    guru: { label: 'Guru Terapis', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'green' },
    wali: { label: 'Wali Murid', icon: <HeartHandshake className="w-3.5 h-3.5" />, color: 'yellow' },
  };

  const currentRoleInfo = roleLabels[currentRole] || roleLabels.admin;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Layers className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                Sistem Terapi Siswa
              </h1>
              <p className="text-2xs text-slate-500 hidden sm:block">
                Absensi, Keuangan & Penggajian Guru
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Filter Bulan Aktif */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Periode:</span>
            <select
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-12">Desember 2026</option>
            </select>
          </div>

          {/* Tombol Panduan & Status Supabase */}
          <button
            type="button"
            onClick={onOpenSupabaseGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Lihat Schema SQL & Panduan Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Supabase & SQL</span>
          </button>

          {/* Quick Role Switcher Tester */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="text-2xs text-slate-400 hidden sm:inline">Peran:</span>
              <span className="flex items-center gap-1">
                {currentRoleInfo.icon}
                <span>{currentRoleInfo.label}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95"
                onClick={() => setRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 text-2xs font-bold uppercase tracking-wider text-slate-400">
                  Ganti Peran Akun (Mode Tes)
                </div>

                <button
                  onClick={() => switchRole('admin')}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'admin' ? 'font-bold text-purple-700 bg-purple-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin (Hak Akses Penuh)</span>
                  </span>
                  {currentRole === 'admin' && <span className="text-purple-600 text-xs">✓</span>}
                </button>

                <button
                  onClick={() => switchRole('kepala')}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'kepala' ? 'font-bold text-sky-700 bg-sky-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                    <span>Kepala Terapi</span>
                  </span>
                  {currentRole === 'kepala' && <span className="text-sky-600 text-xs">✓</span>}
                </button>

                <button
                  onClick={() => switchRole('guru')}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'guru' ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Guru Terapis</span>
                  </span>
                  {currentRole === 'guru' && <span className="text-emerald-600 text-xs">✓</span>}
                </button>

                <button
                  onClick={() => switchRole('wali', 'aktif')}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === 'wali' && currentUser?.status !== 'dibekukan'
                      ? 'font-bold text-amber-700 bg-amber-50/50'
                      : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                    <span>Wali Murid (Aktif)</span>
                  </span>
                  {currentRole === 'wali' && currentUser?.status !== 'dibekukan' && (
                    <span className="text-amber-600 text-xs">✓</span>
                  )}
                </button>

                <button
                  onClick={() => switchRole('wali', 'dibekukan')}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-rose-50 transition-colors ${
                    currentUser?.status === 'dibekukan'
                      ? 'font-bold text-rose-700 bg-rose-50/70'
                      : 'text-rose-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Wali Murid (Dibekukan)</span>
                  </span>
                  {currentUser?.status === 'dibekukan' && (
                    <span className="text-rose-600 text-xs">✓</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* User Name & Logout */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
            <div className="text-right hidden xl:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">
                {currentUser?.fullName}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">@{currentUser?.username}</p>
            </div>
            <button
              onClick={logout}
              title="Keluar / Ganti Akun"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
