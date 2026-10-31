import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  CreditCard,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Payment, PaymentMethod, Student } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { KwitansiModal } from '../kwitansi/KwitansiModal';
import { formatRupiah } from '../../lib/numberToIndonesianWords';

export const PembayaranView: React.FC = () => {
  const { currentRole, currentUser, syncFreezeStudent } = useAuth();
  const {
    payments,
    students,
    packages,
    activeMonth,
    markPaymentStatus,
    generateMonthlyPayments,
    toggleStudentFreeze,
  } = useData();

  const [statusFilter, setStatusFilter] = useState<'semua' | 'lunas' | 'belum_lunas'>('semua');
  const [search, setSearch] = useState('');

  // Modal Tandai Pembayaran
  const [markingPayment, setMarkingPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Non-tunai');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Modal Cetak Kwitansi
  const [viewingKwitansi, setViewingKwitansi] = useState<{
    payment: Payment;
    student: Student;
  } | null>(null);

  const canManagePayment = currentRole === 'admin' || currentRole === 'kepala';

  // Filter tagihan
  const monthPayments = payments.filter((p) => p.monthYear === activeMonth);

  // Jika wali murid, hanya tampilkan anak miliknya
  const displayedPayments =
    currentRole === 'wali'
      ? monthPayments.filter((p) => {
          const student = students.find((s) => s.id === p.studentId);
          return (
            student?.parentUserId === currentUser?.id ||
            currentUser?.studentIds?.includes(student?.id || '') ||
            student?.parentName === currentUser?.fullName
          );
        })
      : monthPayments;

  const filteredPayments = displayedPayments.filter((p) => {
    const student = students.find((s) => s.id === p.studentId);
    const matchSearch =
      !search ||
      student?.name.toLowerCase().includes(search.toLowerCase()) ||
      student?.parentName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'semua' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTagihan = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalLunas = filteredPayments
    .filter((p) => p.status === 'lunas')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalBelum = filteredPayments
    .filter((p) => p.status === 'belum_lunas')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleOpenMarkPaid = (payment: Payment) => {
    setMarkingPayment(payment);
    setPaymentMethod('Non-tunai');
    setPaymentNotes('');
  };

  const handleConfirmPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingPayment) return;

    markPaymentStatus(
      markingPayment.id,
      'lunas',
      paymentMethod,
      currentUser?.fullName || 'Petugas Keuangan',
      paymentNotes
    );

    setMarkingPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pembayaran SPP & Cetak Kwitansi ({activeMonth})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Checklist status bayar (Tunai / Non-tunai), cetak kwitansi resmi, dan manajemen pembekuan akun.
          </p>
        </div>

        {canManagePayment && (
          <button
            onClick={() => generateMonthlyPayments(activeMonth)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            Sinkronkan Tagihan Bulan Ini
          </button>
        )}
      </div>

      {/* 3 Kartu Ringkasan Keuangan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
            Total Tagihan Terbit
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(totalTagihan)}
          </div>
          <p className="text-2xs text-slate-500">{filteredPayments.length} siswa tertagih</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600">
            Sudah Lunas Diterima
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {formatRupiah(totalLunas)}
          </div>
          <p className="text-2xs text-emerald-700 font-medium">
            {filteredPayments.filter((p) => p.status === 'lunas').length} pembayaran lunas
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-rose-600">
            Belum Lunas (Tunggakan)
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {formatRupiah(totalBelum)}
          </div>
          <p className="text-2xs text-rose-700 font-medium">
            {filteredPayments.filter((p) => p.status === 'belum_lunas').length} siswa belum bayar
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama siswa atau wali..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium text-slate-700 cursor-pointer"
          >
            <option value="semua">Semua Status Pembayaran</option>
            <option value="lunas">Lunas Saja</option>
            <option value="belum_lunas">Belum Lunas Saja</option>
          </select>
        </div>
      </div>

      {/* Tabel Checklist Pembayaran */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nama Siswa & Wali</th>
                <th className="px-4 py-3.5">Paket Terapi</th>
                <th className="px-4 py-3.5">Tagihan Bulanan</th>
                <th className="px-4 py-3.5 text-center">Status Bayar</th>
                <th className="px-4 py-3.5">Metode & Tgl Bayar</th>
                <th className="px-5 py-3.5 text-right">Kwitansi & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada data pembayaran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const student = students.find((s) => s.id === payment.studentId);
                  const pkg = packages.find((p) => p.id === student?.packageId);
                  const isPaid = payment.status === 'lunas';
                  const isFrozen = student?.accountStatus === 'dibekukan';

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isFrozen ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Siswa & Wali */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{student?.name}</div>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          Wali: {student?.parentName} ({student?.parentPhone})
                        </div>
                      </td>

                      {/* Paket */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{pkg?.name}</div>
                        <span className="text-2xs text-slate-400">
                          {pkg?.durationHours} Jam • {pkg?.frequencyPerWeek}x / minggu
                        </span>
                      </td>

                      {/* Nominal */}
                      <td className="px-4 py-4">
                        <span className="font-black text-sm text-slate-900">
                          {formatRupiah(payment.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <Badge variant={isPaid ? 'green' : 'red'}>
                          {isPaid ? 'Lunas' : 'Belum Lunas'}
                        </Badge>
                      </td>

                      {/* Metode & Tgl */}
                      <td className="px-4 py-4">
                        {isPaid ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {payment.paymentMethod || 'Tunai'}
                            </span>
                            <div className="text-2xs text-slate-400">{payment.paymentDate}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-2xs">Belum ada transaksi</span>
                        )}
                      </td>

                      {/* Aksi & Cetak */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isPaid ? (
                            <button
                              onClick={() => {
                                if (student) {
                                  setViewingKwitansi({ payment, student });
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Cetak Kwitansi
                            </button>
                          ) : (
                            canManagePayment && (
                              <button
                                onClick={() => handleOpenMarkPaid(payment)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Tandai Lunas
                              </button>
                            )
                          )}

                          {/* Tombol Bekukan Akun untuk Tunggakan (Admin & Kepala) */}
                          {canManagePayment && !isPaid && student && (
                            <button
                              onClick={() => {
                                const nextState = !isFrozen;
                                toggleStudentFreeze(student.id, nextState);
                                syncFreezeStudent(student.id, nextState);
                              }}
                              title={isFrozen ? 'Buka Pembekuan Akun Siswa & Wali' : 'Bekukan Akun Karena Menunggak'}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                isFrozen
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {isFrozen ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
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

      {/* Modal Tandai Lunas */}
      <Modal
        isOpen={Boolean(markingPayment)}
        onClose={() => setMarkingPayment(null)}
        title="Konfirmasi Pembayaran Lunas"
        subtitle={`Input metode dan catatan pembayaran untuk siswa terkait`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPaid} className="space-y-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-2xs text-emerald-800 uppercase font-bold block">
              Total yang Harus Dibayar:
            </span>
            <span className="text-xl font-black text-emerald-700">
              {formatRupiah(markingPayment?.amount || 0)}
            </span>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Metode Pembayaran *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                  paymentMethod === 'Tunai'
                    ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="Tunai"
                  checked={paymentMethod === 'Tunai'}
                  onChange={() => setPaymentMethod('Tunai')}
                  className="text-emerald-600"
                />
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">Tunai (Cash di Kasir)</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                  paymentMethod === 'Non-tunai'
                    ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="Non-tunai"
                  checked={paymentMethod === 'Non-tunai'}
                  onChange={() => setPaymentMethod('Non-tunai')}
                  className="text-emerald-600"
                />
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">Non-tunai (Transfer/QRIS)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Keterangan / Nomor Referensi (Opsional)
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Contoh: Transfer BCA a.n. Ratna Dewi / Titip wali"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMarkingPayment(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Simpan & Terbitkan Kwitansi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Kwitansi */}
      {viewingKwitansi && (
        <KwitansiModal
          isOpen={Boolean(viewingKwitansi)}
          onClose={() => setViewingKwitansi(null)}
          payment={viewingKwitansi.payment}
          student={viewingKwitansi.student}
          pkg={packages.find((p) => p.id === viewingKwitansi.student.packageId) || null}
        />
      )}
    </div>
  );
};
