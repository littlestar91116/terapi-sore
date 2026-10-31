import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Package as PackageIcon,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Clock,
  Receipt,
  Wallet,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AppModule } from '../../types';
import { APP_CONFIG } from '../../config/appConfig';

export type NavTabId =
  | 'dashboard'
  | 'siswa'
  | 'guru'
  | 'paket'
  | 'jadwal'
  | 'absensi'
  | 'izin'
  | 'saldo_jam'
  | 'pembayaran'
  | 'gaji'
  | 'hak_akses';

interface SidebarProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { currentRole, currentUser, hasPermission } = useAuth();
  const { students, packages } = useData();

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
    icon: React.ReactNode;
    module?: AppModule;
    adminOnly?: boolean;
    badgeText?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Beranda / Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'siswa',
      label: 'Data Siswa',
      icon: <Users className="w-4 h-4" />,
      module: 'siswa',
    },
    {
      id: 'guru',
      label: 'Data Guru & Tarif',
      icon: <GraduationCap className="w-4 h-4" />,
      module: 'guru',
    },
    {
      id: 'paket',
      label: 'Paket Terapi',
      icon: <PackageIcon className="w-4 h-4" />,
      module: 'paket',
    },
    {
      id: 'jadwal',
      label: 'Jadwal Bulanan',
      icon: <CalendarDays className="w-4 h-4" />,
      module: 'jadwal',
    },
    {
      id: 'absensi',
      label: 'Absensi Siswa',
      icon: <ClipboardCheck className="w-4 h-4" />,
      module: 'absensi',
    },
    {
      id: 'izin',
      label: 'Sistem Izin',
      icon: <FileCheck2 className="w-4 h-4" />,
      module: 'izin_siswa',
      badgeText: 'Paket 2 Jam',
    },
    {
      id: 'saldo_jam',
      label: 'Saldo Jam Terapi',
      icon: <Clock className="w-4 h-4" />,
      module: 'saldo_jam',
    },
    {
      id: 'pembayaran',
      label: 'Pembayaran & Kwitansi',
      icon: <Receipt className="w-4 h-4" />,
      module: 'pembayaran',
    },
    {
      id: 'gaji',
      label: 'Gaji Guru Bulanan',
      icon: <Wallet className="w-4 h-4" />,
      module: 'gaji',
    },
    {
      id: 'hak_akses',
      label: 'Pengaturan Hak Akses',
      icon: <ShieldAlert className="w-4 h-4" />,
      adminOnly: true,
      badgeText: 'Khusus Admin',
    },
  ];


  const has2HourPackage = myStudents.some((s) => {
    const pkg = packages.find((p) => p.id === s.packageId);
    return pkg?.durationHours === 2;
  });

  // Filter menu yang diizinkan untuk role saat ini
  const visibleItems = menuItems.filter((item) => {
    // Khusus wali murid: hanya tampilkan menu yang relevan untuk wali murid
    if (currentRole === 'wali') {
      const allowedWali: NavTabId[] = ['dashboard', 'jadwal', 'pembayaran'];
      if (has2HourPackage) allowedWali.push('izin');
      if (hasHolidayCompensation) allowedWali.push('saldo_jam');
      return allowedWali.includes(item.id);
    }

    // Menu khusus admin hanya untuk admin
    if (item.adminOnly) {
      return currentRole === 'admin';
    }
    // Jika ada mapping modul, cek permission
    if (item.module) {
      return hasPermission(item.module, 'view');
    }
    return true;
  });

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-61px)] p-4 hidden lg:flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Menu Operasional
          </p>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badgeText ? (
                    <span
                      className={`text-3xs px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Info Lembaga Bawah */}
      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-2xs text-slate-500">
        <p className="font-bold text-slate-800">{APP_CONFIG.name}</p>
        <p className="mt-0.5">Operasional: Sen-Kam & Sab-Min</p>
        <p className="text-3xs text-slate-400 mt-1">Jumat: Libur Resmi • {APP_CONFIG.phone}</p>
      </div>
    </aside>
  );
};
