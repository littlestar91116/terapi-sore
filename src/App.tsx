import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { SiswaView } from './components/siswa/SiswaView';
import { GuruView } from './components/guru/GuruView';
import { PaketView } from './components/paket/PaketView';
import { JadwalView } from './components/jadwal/JadwalView';
import { AbsensiView } from './components/absensi/AbsensiView';
import { IzinView } from './components/izin/IzinView';
import { SaldoJamView } from './components/saldo/SaldoJamView';
import { PembayaranView } from './components/pembayaran/PembayaranView';
import { GajiView } from './components/gaji/GajiView';
import { HakAksesView } from './components/hak-akses/HakAksesView';
import { FrozenAccountNotice } from './components/frozen/FrozenAccountNotice';
import { LoginView } from './components/auth/LoginView';
import { SupabaseGuideModal } from './components/supabase-guide/SupabaseGuideModal';
import { LayoutDashboard, CalendarDays, ClipboardCheck, Receipt, Clock } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, currentRole, isFrozen } = useAuth();
  const { students } = useData();

  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supabaseGuideOpen, setSupabaseGuideOpen] = useState(false);

  // Jika belum login, tampilkan layar login
  if (!currentUser) {
    return <LoginView onOpenSupabaseGuide={() => setSupabaseGuideOpen(true)} />;
  }

  // Cek apakah akun wali murid ini dibekukan
  // Wali dibekukan jika status user = 'dibekukan' atau jika seluruh anaknya dibekukan
  const myStudents = students.filter(
    (s) =>
      s.parentUserId === currentUser.id ||
      currentUser.studentIds?.includes(s.id) ||
      s.parentName === currentUser.fullName
  );
  const isStudentFrozen = myStudents.length > 0 && myStudents.every((s) => s.accountStatus === 'dibekukan');
  const isWali = currentRole === 'wali';
  const hasHolidayCompensation = myStudents.some((s) => s.saldoJam > 0);

  if (currentRole === 'wali' && (isFrozen || isStudentFrozen)) {
    return <FrozenAccountNotice />;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenSupabaseGuide={() => setSupabaseGuideOpen(true)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

        {/* Mobile Navigation Drawer */}
        <MobileNav
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 max-w-full overflow-x-hidden">
          {currentTab === 'dashboard' && <DashboardView onNavigateTab={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'siswa' && <SiswaView />}
          {currentTab === 'guru' && <GuruView />}
          {currentTab === 'paket' && <PaketView />}
          {currentTab === 'jadwal' && <JadwalView />}
          {currentTab === 'absensi' && <AbsensiView />}
          {currentTab === 'izin' && <IzinView />}
          {currentTab === 'saldo_jam' && <SaldoJamView />}
          {currentTab === 'pembayaran' && <PembayaranView />}
          {currentTab === 'gaji' && <GajiView />}
          {currentTab === 'hak_akses' && <HakAksesView />}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 z-40 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-3xs font-semibold py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Beranda</span>
        </button>

        <button
          onClick={() => setCurrentTab('jadwal')}
          className={`flex flex-col items-center gap-1 text-3xs font-semibold py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'jadwal' ? 'text-emerald-600 font-bold' : 'text-slate-500'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Jadwal</span>
        </button>

        {!isWali && (
          <button
            onClick={() => setCurrentTab('absensi')}
            className={`flex flex-col items-center gap-1 text-3xs font-semibold py-1 px-2 rounded-xl transition-colors ${
              currentTab === 'absensi' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Absensi</span>
          </button>
        )}

        <button
          onClick={() => setCurrentTab('pembayaran')}
          className={`flex flex-col items-center gap-1 text-3xs font-semibold py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'pembayaran' ? 'text-emerald-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Tagihan</span>
        </button>

        {(!isWali || hasHolidayCompensation) && (
          <button
            onClick={() => setCurrentTab('saldo_jam')}
            className={`flex flex-col items-center gap-1 text-3xs font-semibold py-1 px-2 rounded-xl transition-colors ${
              currentTab === 'saldo_jam' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Saldo Jam</span>
          </button>
        )}
      </nav>

      {/* Supabase Guide & SQL Modal */}
      <SupabaseGuideModal
        isOpen={supabaseGuideOpen}
        onClose={() => setSupabaseGuideOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
