import React, { useState } from 'react';
import {
  Wallet,
  Settings,
  RefreshCw,
  Printer,
  CheckCircle,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Payroll, Teacher, FinancialSettings } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { formatRupiah, terbilangRupiah } from '../../lib/numberToIndonesianWords';

export const GajiView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const {
    payrolls,
    teachers,
    financialSettings,
    updateFinancialSettings,
    calculatePayrollForMonth,
    markPayrollPaid,
    activeMonth,
  } = useData();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<{
    payroll: Payroll;
    teacher: Teacher;
  } | null>(null);

  // Form Pengaturan Keuangan
  const [settingsForm, setSettingsForm] = useState<FinancialSettings>(financialSettings);

  const canEditRates = currentRole === 'admin' || currentRole === 'kepala';

  const monthPayrolls = payrolls.filter((p) => p.monthYear === activeMonth);

  // Filter untuk guru: hanya lihat slip gaji miliknya sendiri
  const displayedPayrolls =
    currentRole === 'guru'
      ? monthPayrolls.filter((p) => {
          const teacher = teachers.find((t) => t.id === p.teacherId);
          return (
            p.teacherId === currentUser?.teacherId ||
            teacher?.name === currentUser?.fullName
          );
        })
      : monthPayrolls;

  const handleRecalculate = () => {
    calculatePayrollForMonth(activeMonth);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinancialSettings(settingsForm);
    setIsSettingsOpen(false);
    calculatePayrollForMonth(activeMonth);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Penggajian Guru Bulanan ({activeMonth})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perhitungan otomatis jam riil diajar, bonus kehadiran penuh, dan potongan izin.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canEditRates && (
            <>
              <button
                onClick={() => {
                  setSettingsForm(financialSettings);
                  setIsSettingsOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Pengaturan Tarif
              </button>
              <button
                onClick={handleRecalculate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Hitung Ulang Gaji
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner Aturan Penggajian Resmi */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-3xl flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <h4 className="font-bold text-sm">Ketentuan Resmi Perhitungan Gaji:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-emerald-900 pt-1">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <strong>1. Sistem Gaji:</strong> Per jam (hanya sesi Hadir) × tarif{' '}
              {formatRupiah(financialSettings.defaultHourlyRate)}, atau sistem bulanan nominal tetap.
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <strong>2. Bonus Kehadiran Penuh:</strong> Otomatis{' '}
              {formatRupiah(financialSettings.fullAttendanceBonus)} jika hadir penuh tanpa izin (0 hari).
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <strong>3. Potongan Izin:</strong> Jika guru izin &gt; 1 kali, dipotong{' '}
              {formatRupiah(financialSettings.dailyLeaveDeduction)} per hari izin.
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Gaji Guru */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nama Guru</th>
                <th className="px-4 py-3.5">Sistem Gaji</th>
                <th className="px-4 py-3.5 text-center">Jam Riil Diajar</th>
                <th className="px-4 py-3.5">Gaji Pokok / Jam</th>
                <th className="px-4 py-3.5 text-emerald-700">Bonus Hadir Penuh</th>
                <th className="px-4 py-3.5 text-rose-700">Potongan Izin</th>
                <th className="px-5 py-3.5 font-bold">Total Gaji Diterima</th>
                <th className="px-5 py-3.5 text-right">Aksi & Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {displayedPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data gaji untuk periode bulan {activeMonth}. Klik tombol "Hitung Ulang
                    Gaji" di atas.
                  </td>
                </tr>
              ) : (
                displayedPayrolls.map((payroll) => {
                  const teacher = teachers.find((t) => t.id === payroll.teacherId);
                  const isPaid = payroll.status === 'dibayar';

                  return (
                    <tr key={payroll.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama Guru */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{teacher?.name}</div>
                        <span className="text-2xs text-slate-400">ID: {payroll.teacherId}</span>
                      </td>

                      {/* Sistem */}
                      <td className="px-4 py-4">
                        <Badge variant={payroll.salarySystem === 'per_jam' ? 'blue' : 'purple'}>
                          {payroll.salarySystem === 'per_jam' ? 'Per Jam Terapi' : 'Bulanan Tetap'}
                        </Badge>
                      </td>

                      {/* Jam Riil */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-extrabold text-slate-800">
                          {payroll.totalHoursTaught} Jam
                        </span>
                      </td>

                      {/* Pokok */}
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {formatRupiah(payroll.baseSalary)}
                      </td>

                      {/* Bonus */}
                      <td className="px-4 py-4 text-emerald-600 font-semibold">
                        {payroll.bonusFullAttendance > 0 ? (
                          <span>+{formatRupiah(payroll.bonusFullAttendance)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Potongan */}
                      <td className="px-4 py-4 text-rose-600 font-semibold">
                        {payroll.deductionLeave > 0 ? (
                          <span>
                            -{formatRupiah(payroll.deductionLeave)} ({payroll.totalLeaveDays} hari)
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <div className="font-black text-sm text-emerald-700">
                          {formatRupiah(payroll.totalAmount)}
                        </div>
                        <Badge variant={isPaid ? 'green' : 'yellow'} size="sm">
                          {isPaid ? 'Sudah Dibayar' : 'Draft Perhitungan'}
                        </Badge>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (teacher) setViewingSlip({ payroll, teacher });
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Slip Gaji
                          </button>

                          {canEditRates && !isPaid && (
                            <button
                              onClick={() => markPayrollPaid(payroll.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pengaturan Tarif Keuangan */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Pengaturan Tarif Keuangan & Gaji"
        subtitle="Ubah parameter perhitungan tarif per jam, bonus kehadiran, dan potongan izin"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Tarif Default Per Jam Terapi (Rp) *
            </label>
            <input
              type="number"
              step={1000}
              required
              value={settingsForm.defaultHourlyRate}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  defaultHourlyRate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
            <span className="text-2xs text-slate-500 mt-1 block">
              Standar klinik: <strong>{formatRupiah(settingsForm.defaultHourlyRate)}</strong> / jam
            </span>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Bonus Kehadiran Penuh Sebulan (Rp) *
            </label>
            <input
              type="number"
              step={5000}
              required
              value={settingsForm.fullAttendanceBonus}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  fullAttendanceBonus: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
            <span className="text-2xs text-slate-500 mt-1 block">
              Diberikan jika guru hadir 100% tanpa izin sama sekali
            </span>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nominal Potongan Harian (Jika Izin &gt; 1 Kali) (Rp) *
            </label>
            <input
              type="number"
              step={5000}
              required
              value={settingsForm.dailyLeaveDeduction}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  dailyLeaveDeduction: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
            <span className="text-2xs text-slate-500 mt-1 block">
              Dikenakan dikali total hari izin jika izin lebih dari 1 kali
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cetak Slip Gaji */}
      {viewingSlip && (
        <Modal
          isOpen={Boolean(viewingSlip)}
          onClose={() => setViewingSlip(null)}
          title="Slip Gaji Guru"
          subtitle={`Periode Bulan ${viewingSlip.payroll.monthYear}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="flex justify-end print:hidden">
              <button
                onClick={handlePrintSlip}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Cetak Slip Gaji / PDF
              </button>
            </div>

            {/* Lembar Slip Gaji */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 space-y-5 text-slate-800">
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">KLINIK TERAPI SISWA CERIA</h3>
                  <p className="text-xs text-slate-600">SLIP GAJI & HONORARIUM TENAGA AHLI</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-slate-900">Periode: {viewingSlip.payroll.monthYear}</p>
                  <p className="text-2xs text-slate-500">ID: {viewingSlip.payroll.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs py-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-2xs text-slate-400 block font-bold">NAMA GURU TERAPIS:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingSlip.teacher.name}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block font-bold">SISTEM PENGGAJIAN:</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {viewingSlip.payroll.salarySystem === 'per_jam'
                      ? 'Per Jam Terapi'
                      : 'Bulanan Tetap'}
                  </span>
                </div>
              </div>

              {/* Rincian Komponen Gaji */}
              <div className="space-y-2 text-xs border-y border-dashed border-slate-200 py-3">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">
                    Gaji Pokok / Jam ({viewingSlip.payroll.totalHoursTaught} Jam × {formatRupiah(viewingSlip.payroll.hourlyRate)})
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(viewingSlip.payroll.baseSalary)}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Bonus Kehadiran Penuh (0 Hari Izin)</span>
                  <span className="font-bold">
                    +{formatRupiah(viewingSlip.payroll.bonusFullAttendance)}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-rose-700">
                  <span>
                    Potongan Izin ({viewingSlip.payroll.totalLeaveDays} Hari Izin Disetujui)
                  </span>
                  <span className="font-bold">
                    -{formatRupiah(viewingSlip.payroll.deductionLeave)}
                  </span>
                </div>
              </div>

              {/* Total Bersih */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-2xs uppercase tracking-wider font-bold text-emerald-800 block">
                    TOTAL DITERIMA (TAKE HOME PAY):
                  </span>
                  <span className="text-2xs italic text-emerald-900">
                    "{terbilangRupiah(viewingSlip.payroll.totalAmount)}"
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-700">
                  {formatRupiah(viewingSlip.payroll.totalAmount)}
                </span>
              </div>

              {/* Tanda Tangan */}
              <div className="pt-6 flex justify-between text-xs text-center">
                <div>
                  <p className="mb-14 text-slate-600">Penerima (Guru Terapis),</p>
                  <p className="font-bold underline">{viewingSlip.teacher.name}</p>
                </div>
                <div>
                  <p className="mb-14 text-slate-600">Kepala Lembaga Terapi,</p>
                  <p className="font-bold underline">Hj. Fatimah, S.Psi, M.Ed</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
