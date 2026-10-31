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

          {/* Peran Akun Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs">
            <span className="flex items-center gap-1.5">
              {currentRoleInfo.icon}
              <span>{currentRoleInfo.label}</span>
            </span>
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
