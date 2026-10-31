import React from 'react';
import { X, Layers, LayoutDashboard, CalendarDays, ClipboardCheck, Receipt, Clock } from 'lucide-react';
import { NavTabId } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AppModule } from '../../types';
import { APP_CONFIG } from '../../config/appConfig';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
}) => {
  const { currentRole, currentUser, hasPermission } = useAuth();
  const { students } = useData();

  const myStudents = currentRole === 'wali'
    ? students.filter(
        (s) =>
          s.parentUserId === currentUser?.id ||
          currentUser?.studentIds?.includes(s.id) ||
          s.parentName === currentUser?.fullName
      )
    : students;
  const hasHolidayCompensation = myStudents.some((s) => s.saldoJam > 0);

  const menuItems: {
    id: NavTabId;
    label: string;
    module?: AppModule;
    adminOnly?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Beranda / Dashboard' },
    { id: 'siswa', label: 'Data Siswa', module: 'siswa' },
    { id: 'guru', label: 'Data Guru & Tarif', module: 'guru' },
    { id: 'paket', label: 'Paket Terapi', module: 'paket' },
    { id: 'jadwal', label: 'Jadwal Bulanan', module: 'jadwal' },
    { id: 'absensi', label: 'Absensi Siswa', module: 'absensi' },
    { id: 'izin', label: 'Sistem Izin (Paket 2 Jam)', module: 'izin_siswa' },
    { id: 'saldo_jam', label: 'Saldo Jam Terapi', module: 'saldo_jam' },
    { id: 'pembayaran', label: 'Pembayaran & Kwitansi', module: 'pembayaran' },
    { id: 'gaji', label: 'Gaji Guru Bulanan', module: 'gaji' },
    { id: 'hak_akses', label: 'Pengaturan Hak Akses (Admin)', adminOnly: true },
  ];

  const visibleItems = menuItems.filter((item) => {
    if (item.adminOnly) return currentRole === 'admin';
    if (item.id === 'saldo_jam' && currentRole === 'wali' && !hasHolidayCompensation) {
      return false;
    }
    if (item.module) return hasPermission(item.module, 'view');
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white p-5 shadow-2xl flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 border border-slate-200 shadow-2xs shrink-0">
                <img
                  src={APP_CONFIG.logoUrl}
                  alt="Little Star Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-slate-800 text-xs leading-tight">
                {APP_CONFIG.name}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 text-2xs text-slate-400">
          Versi 1.0.0 • Sistem Absensi & Keuangan
        </div>
      </div>
    </div>
  );
};
