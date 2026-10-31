import React from 'react';
import { AlertOctagon, Phone, CreditCard, Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatRupiah } from '../../lib/numberToIndonesianWords';
import { APP_CONFIG } from '../../config/appConfig';

export const FrozenAccountNotice: React.FC = () => {
  const { currentUser, logout, switchRole } = useAuth();
  const { students, payments, packages } = useData();

  // Ambil data siswa yang terhubung dengan wali ini
  const myStudents = students.filter(
    (s) =>
      s.parentUserId === currentUser?.id ||
      currentUser?.studentIds?.includes(s.id) ||
      s.accountStatus === 'dibekukan'
  );

  // Ambil tunggakan pembayaran
  const myUnpaidBills = payments.filter(
    (p) => myStudents.some((s) => s.id === p.studentId) && p.status === 'belum_lunas'
  );

  const totalTunggakan = myUnpaidBills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Banner Atas */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-md">
              <img
                src={APP_CONFIG.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-xs ring-1 ring-white/20 shadow-inner">
              <AlertOctagon className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">{APP_CONFIG.name}</p>
          <h1 className="text-2xl font-bold tracking-tight">Akun Anda Sedang Dibekukan</h1>
          <p className="text-rose-100 text-sm mt-1 max-w-md mx-auto">
            Akses ke jadwal terapi dan pengajuan izin sementara dinonaktifkan karena terdapat
            kewajiban administrasi yang belum diselesaikan.
          </p>
        </div>

        {/* Detail & Rincian */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 mb-3">
              <CreditCard className="w-4 h-4 text-rose-600" />
              Rincian Tagihan yang Perlu Diselesaikan
            </h3>

            {myUnpaidBills.length > 0 ? (
              <div className="space-y-2.5">
                {myUnpaidBills.map((bill) => {
                  const student = students.find((s) => s.id === bill.studentId);
                  const pkg = packages.find((p) => p.id === student?.packageId);
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-rose-200/60 shadow-2xs"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {student?.name || 'Siswa'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Periode {bill.monthYear} • {pkg?.name}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-rose-600">
                        {formatRupiah(bill.amount)}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-2 flex justify-between items-center text-sm font-bold text-slate-800 border-t border-rose-200">
                  <span>Total Tagihan:</span>
                  <span className="text-base text-rose-600">{formatRupiah(totalTunggakan)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Data siswa Anda sedang ditandai dibekukan oleh Kepala Terapi. Silakan hubungi
                administrasi untuk verifikasi status aktivasi.
              </p>
            )}
          </div>

          {/* Instruksi Pembayaran */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Cara Mengaktifkan Kembali Akun:</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Lakukan pembayaran melalui kasir klinik (Tunai) atau transfer non-tunai ke rekening
                  resmi yayasan terapi.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Konfirmasi bukti pembayaran ke bagian administrasi atau Kepala Terapi untuk
                  langsung membuka pembekuan.
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Kontak & Bantuan */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20Klinik%20Terapi,%20saya%20ingin%20konfirmasi%20pembayaran%20dan%20aktivasi%20akun."
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-xs transition-colors"
            >
              <Phone className="w-4 h-4" />
              Hubungi Admin via WhatsApp
            </a>
            <button
              onClick={logout}
              className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Keluar ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
