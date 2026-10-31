import React, { useState } from 'react';
import {
  Clock,
  Plus,
  MinusCircle,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

export const SaldoJamView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const {
    students,
    packages,
    saldoHistory,
    batchInputSchoolHoliday,
    useStudentSaldoJam,
  } = useData();

  const [search, setSearch] = useState('');

  // Modal Batch Libur Sekolah
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState('2026-11-04');
  const [holidayDesc, setHolidayDesc] = useState('Peringatan Hari Libur Sekolah');
  const [holidaySuccessCount, setHolidaySuccessCount] = useState<number | null>(null);

  // Modal Pemakaian Saldo Jam
  const [isUseModalOpen, setIsUseModalOpen] = useState(false);
  const [useStudentId, setUseStudentId] = useState('');
  const [useHours, setUseHours] = useState(1);
  const [useDesc, setUseDesc] = useState('Sesi terapi pengganti (makeup class)');
  const [useError, setUseError] = useState<string | null>(null);

  const canManage = currentRole === 'admin' || currentRole === 'kepala';

  const handleOpenHolidayModal = () => {
    setHolidayDate('2026-11-04');
    setHolidayDesc('Sekolah meliburkan kegiatan belajar');
    setHolidaySuccessCount(null);
    setIsHolidayModalOpen(true);
  };

  const handleBatchHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;

    const count = batchInputSchoolHoliday(holidayDate, holidayDesc);
    setHolidaySuccessCount(count);
    setTimeout(() => {
      setIsHolidayModalOpen(false);
      setHolidaySuccessCount(null);
    }, 2000);
  };

  const handleOpenUseModal = (studentId?: string) => {
    setUseStudentId(studentId || students[0]?.id || '');
    setUseHours(1);
    setUseDesc('Sesi terapi pengganti (makeup class)');
    setUseError(null);
    setIsUseModalOpen(true);
  };

  const handleUseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === useStudentId);
    if (!student) return;

    if (student.saldoJam < useHours) {
      setUseError(
        `Saldo jam siswa ini tidak cukup! Saldo tersedia: ${student.saldoJam} jam, dicoba pakai: ${useHours} jam.`
      );
      return;
    }

    const success = useStudentSaldoJam(useStudentId, useHours, useDesc);
    if (success) {
      setIsUseModalOpen(false);
    } else {
      setUseError('Gagal memproses pemakaian saldo jam.');
    }
  };

  // Filter siswa untuk role wali murid
  const displayedStudents =
    currentRole === 'wali'
      ? students.filter(
          (s) =>
            s.parentUserId === currentUser?.id ||
            currentUser?.studentIds?.includes(s.id) ||
            s.parentName === currentUser?.fullName
        )
      : students;

  const hasHolidayCompensation = displayedStudents.some((s) => s.saldoJam > 0);

  // ==========================================
  // VIEW KHUSUS WALI MURID:
  // "saldo jam itu hanya sebuah tampilan saja dan baru muncul ketika ada diliburkan oleh sekolah"
  // ==========================================
  if (currentRole === 'wali') {
    const myStudentIds = new Set(displayedStudents.map((s) => s.id));
    const myChildHistory = saldoHistory.filter((h) => myStudentIds.has(h.studentId));

    if (!hasHolidayCompensation) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Saldo Jam Terapi Ananda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Informasi saldo jam kompensasi resmi jika ada sesi terapi yang diliburkan oleh pihak sekolah.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-2xs space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Belum Ada Sesi yang Diliburkan Sekolah
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Tampilan saldo jam kompensasi ini akan otomatis aktif dan terisi apabila terdapat
                jadwal terapi ananda yang ditiadakan/diliburkan oleh pihak sekolah.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-2xs text-emerald-800">
              Saat ini seluruh sesi terapi ananda berjalan sesuai jadwal yang telah ditentukan.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Informasi Saldo Jam Terapi Ananda
            </h2>
            <Badge variant="green">Kompensasi Libur Sekolah</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tampilan informasi hak jam terapi pengganti yang timbul akibat sesi diliburkan sekolah.
          </p>
        </div>

        {/* Banner Penjelasan Khusus Wali */}
        <div className="p-4.5 bg-emerald-50/70 border border-emerald-200/80 rounded-3xl flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs text-emerald-950 space-y-1">
            <h4 className="font-bold text-sm">Hak Kompensasi Jam Pengganti Ananda</h4>
            <p className="text-emerald-800 leading-relaxed">
              Saldo jam di bawah ini merupakan akumulasi sesi terapi ananda yang ditiadakan karena
              sekolah meliburkan kegiatan. Jam ini menjadi hak ananda untuk dialokasikan menjadi
              <strong> sesi terapi pengganti (makeup session)</strong> tanpa dipungut biaya tambahan.
            </p>
          </div>
        </div>

        {/* Kartu Tampilan Saldo Ananda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayedStudents.map((student) => {
            const pkg = packages.find((p) => p.id === student.packageId);
            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Nama Siswa:</span>
                  <Badge variant={student.saldoJam > 0 ? 'green' : 'gray'}>
                    {student.saldoJam > 0 ? 'Tersedia Kompensasi' : 'Tidak Ada Saldo'}
                  </Badge>
                </div>
                <div className="text-lg font-bold text-slate-900">{student.name}</div>
                <p className="text-xs text-slate-500">{pkg?.name}</p>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-600">Saldo Jam Pengganti:</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {student.saldoJam} Jam
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Riwayat Libur Sekolah Ananda */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Rincian Tanggal Diliburkan Sekolah
            </h3>
            <p className="text-2xs text-slate-500">
              Daftar sesi yang tercatat resmi diliburkan oleh sekolah untuk ananda Anda
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Waktu Pencatatan</th>
                  <th className="px-4 py-3.5">Nama Ananda</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Jumlah Jam</th>
                  <th className="px-5 py-3.5">Keterangan Libur Sekolah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {myChildHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                      Belum ada rincian riwayat libur sekolah.
                    </td>
                  </tr>
                ) : (
                  myChildHistory.map((h) => {
                    const student = students.find((s) => s.id === h.studentId);
                    const isAdd = h.type === 'penambahan';
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-2xs text-slate-500">
                          {new Date(h.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{student?.name}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant={isAdd ? 'green' : 'blue'}>
                            {isAdd ? 'Kompensasi Masuk' : 'Sesi Terpakai'}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-3.5 text-center font-bold ${
                            isAdd ? 'text-emerald-600' : 'text-sky-600'
                          }`}
                        >
                          {isAdd ? `+${h.amountHours}` : `-${h.amountHours}`} Jam
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{h.description}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.parentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Saldo Jam Terapi Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kompensasi jam terapi otomatis jika sesi dibatalkan karena sekolah meliburkan.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenHolidayModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Input Libur Sekolah (Massal)
            </button>
            <button
              onClick={() => handleOpenUseModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <MinusCircle className="w-4 h-4" />
              Pakai Saldo (Sesi Pengganti)
            </button>
          </div>
        )}
      </div>

      {/* Banner Penjelasan Sistem Saldo Jam */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-3xl flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <h4 className="font-bold text-sm">Bagaimana Saldo Jam Terapi Bekerja?</h4>
          <p className="text-emerald-800 leading-relaxed">
            1. Jika klinik atau sekolah meliburkan jadwal terapi (status <em>Libur dari sekolah</em>),
            jam sesi tersebut otomatis ditambahkan ke saldo siswa untuk bulan berikutnya.
          </p>
          <p className="text-emerald-800 leading-relaxed">
            2. Fitur <strong>Input Libur Sekolah (Massal)</strong> memungkinkan Kepala/Admin memilih satu
            tanggal libur, dan seluruh siswa yang terjadwal di hari itu langsung otomatis mendapat saldo kompensasi.
          </p>
        </div>
      </div>

      {/* Grid Saldo Siswa */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Saldo Jam Tersedia per Siswa
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nama Siswa</th>
                <th className="px-4 py-3.5">Paket Terapi</th>
                <th className="px-4 py-3.5">Nama Wali</th>
                <th className="px-4 py-3.5 text-center">Saldo Jam Aktif</th>
                {canManage && <th className="px-5 py-3.5 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada siswa yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const pkg = packages.find((p) => p.id === student.packageId);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{student.name}</td>
                      <td className="px-4 py-4 text-slate-600">{pkg?.name}</td>
                      <td className="px-4 py-4 text-slate-600">{student.parentName}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-sm rounded-xl border border-emerald-200">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          {student.saldoJam} Jam
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenUseModal(student.id)}
                            disabled={student.saldoJam <= 0}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                            Gunakan Saldo
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Mutasi Saldo Jam */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Mutasi Saldo Jam (Penambahan & Pemakaian)
          </h3>
          <p className="text-2xs text-slate-500">
            Catatan audit otomatis untuk setiap perubahan saldo jam siswa
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Waktu Pencatatan</th>
                <th className="px-4 py-3.5">Nama Siswa</th>
                <th className="px-4 py-3.5 text-center">Tipe Mutasi</th>
                <th className="px-4 py-3.5 text-center">Jumlah Jam</th>
                <th className="px-5 py-3.5">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {saldoHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Belum ada riwayat mutasi saldo jam.
                  </td>
                </tr>
              ) : (
                saldoHistory.map((history) => {
                  const student = students.find((s) => s.id === history.studentId);
                  const isPenambahan = history.type === 'penambahan';

                  return (
                    <tr key={history.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 text-2xs">
                        {new Date(history.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {student?.name || 'Siswa'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant={isPenambahan ? 'green' : 'blue'}>
                          {isPenambahan ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              Penambahan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-sky-600" />
                              Pemakaian
                            </span>
                          )}
                        </Badge>
                      </td>
                      <td
                        className={`px-4 py-3.5 text-center font-bold text-sm ${
                          isPenambahan ? 'text-emerald-600' : 'text-sky-600'
                        }`}
                      >
                        {isPenambahan ? `+${history.amountHours}` : `-${history.amountHours}`} Jam
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{history.description}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Libur Sekolah Massal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Input Libur Sekolah (Massal)"
        subtitle="Otomatis menambah saldo jam ke semua siswa yang terjadwal pada tanggal tersebut"
        maxWidth="md"
      >
        <form onSubmit={handleBatchHolidaySubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pilih Tanggal Libur Sekolah *
            </label>
            <input
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Keterangan Libur *
            </label>
            <input
              type="text"
              required
              value={holidayDesc}
              onChange={(e) => setHolidayDesc(e.target.value)}
              placeholder="Contoh: Libur Nasional / Kegiatan Khusus Sekolah"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {holidaySuccessCount !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Berhasil! Sebanyak <strong>{holidaySuccessCount} sesi</strong> pada tanggal tersebut
                diubah menjadi 'Libur dari sekolah' dan saldo jam siswa telah dikreditkan otomatis.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Proses Libur & Tambah Saldo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pemakaian Saldo Jam */}
      <Modal
        isOpen={isUseModalOpen}
        onClose={() => setIsUseModalOpen(false)}
        title="Gunakan Saldo Jam Terapi"
        subtitle="Catat sesi terapi pengganti (makeup class) menggunakan saldo yang ada"
        maxWidth="md"
      >
        <form onSubmit={handleUseSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pilih Siswa *
            </label>
            <select
              value={useStudentId}
              onChange={(e) => setUseStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Tersedia: {s.saldoJam} Jam)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Jumlah Jam Dipakai *
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={useHours}
              onChange={(e) => setUseHours(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Keterangan Penggunaan
            </label>
            <input
              type="text"
              value={useDesc}
              onChange={(e) => setUseDesc(e.target.value)}
              placeholder="Contoh: Sesi pengganti terapi hari Sabtu..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {useError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{useError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Kurangi Saldo & Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
