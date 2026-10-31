import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  GraduationCap,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StudentLeave, TeacherLeave } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

export const IzinView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const {
    studentLeaves,
    teacherLeaves,
    students,
    teachers,
    packages,
    sessions,
    requestStudentLeave,
    reviewStudentLeave,
    requestTeacherLeave,
    reviewTeacherLeave,
  } = useData();

  const [activeTab, setActiveTab] = useState<'siswa' | 'guru'>('siswa');

  // Modal State: Izin Siswa
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [studentReason, setStudentReason] = useState('');
  const [studentLeaveError, setStudentLeaveError] = useState<string | null>(null);

  // Modal State: Izin Guru
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherLeaveDate, setTeacherLeaveDate] = useState('');
  const [teacherReason, setTeacherReason] = useState('');

  // Rejection Dialog State
  const [rejectingLeave, setRejectingLeave] = useState<{
    id: string;
    type: 'siswa' | 'guru';
  } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const canReview = currentRole === 'admin' || currentRole === 'kepala';

  // Siswa yang berhak izin (HANYA PAKET 2 JAM!)
  const eligibleStudents = students.filter((s) => {
    const pkg = packages.find((p) => p.id === s.packageId);
    return pkg?.durationHours === 2;
  });

  // Jika login sebagai Wali, hanya tampilkan anaknya
  const userStudents = currentRole === 'wali'
    ? students.filter(
        (s) =>
          s.parentUserId === currentUser?.id ||
          currentUser?.studentIds?.includes(s.id) ||
          s.parentName === currentUser?.fullName
      )
    : students;

  const userEligibleStudents = userStudents.filter((s) => {
    const pkg = packages.find((p) => p.id === s.packageId);
    return pkg?.durationHours === 2;
  });

  const handleOpenStudentLeaveModal = () => {
    const defaultStudent = userEligibleStudents[0] || eligibleStudents[0];
    setSelectedStudentId(defaultStudent ? defaultStudent.id : '');
    setSelectedSessionId('');
    setStudentReason('');
    setStudentLeaveError(null);
    setIsStudentModalOpen(true);
  };

  const currentModalStudent = students.find((s) => s.id === selectedStudentId);
  const currentModalPkg = packages.find((p) => p.id === currentModalStudent?.packageId);
  const upcomingStudentSessions = sessions.filter(
    (s) => s.studentId === selectedStudentId && s.attendanceStatus !== 'Libur dari sekolah'
  );

  const handleSubmitStudentLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedSessionId || !studentReason.trim()) return;

    const session = sessions.find((s) => s.id === selectedSessionId);
    if (!session) return;

    const res = requestStudentLeave(
      selectedStudentId,
      selectedSessionId,
      session.sessionDate,
      studentReason.trim()
    );

    if (res.success) {
      setIsStudentModalOpen(false);
    } else {
      setStudentLeaveError(res.message);
    }
  };

  const handleOpenTeacherLeaveModal = () => {
    const defaultTeacher = teachers.find(
      (t) => t.id === currentUser?.teacherId || t.name === currentUser?.fullName
    ) || teachers[0];
    setSelectedTeacherId(defaultTeacher ? defaultTeacher.id : '');
    setTeacherLeaveDate(new Date().toISOString().split('T')[0]);
    setTeacherReason('');
    setIsTeacherModalOpen(true);
  };

  const handleSubmitTeacherLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !teacherLeaveDate || !teacherReason.trim()) return;

    requestTeacherLeave(selectedTeacherId, teacherLeaveDate, teacherReason.trim());
    setIsTeacherModalOpen(false);
  };

  const handleConfirmReject = () => {
    if (!rejectingLeave) return;

    if (rejectingLeave.type === 'siswa') {
      reviewStudentLeave(
        rejectingLeave.id,
        'ditolak',
        currentUser?.fullName || 'Kepala',
        rejectionNotes || 'Alasan ditolak'
      );
    } else {
      reviewTeacherLeave(rejectingLeave.id, 'ditolak', currentUser?.fullName || 'Kepala');
    }

    setRejectingLeave(null);
    setRejectionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sistem Perizinan (Siswa & Guru)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengajuan izin siswa (khusus paket 2 jam) dan persetujuan izin guru yang memengaruhi gaji.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('siswa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'siswa'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Izin Siswa (Paket 2 Jam)
          </button>
          <button
            onClick={() => setActiveTab('guru')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'guru'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Izin Guru
          </button>
        </div>
      </div>

      {/* TAB 1: IZIN SISWA (KHUSUS PAKET 2 JAM) */}
      {activeTab === 'siswa' && (
        <div className="space-y-4">
          {/* Banner Syarat Paket 2 Jam */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Fasilitas Khusus Siswa Paket 2 Jam
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Hanya siswa dengan paket intensif 2 jam yang dapat mengajukan permohonan izin
                  sesi. Sesi yang disetujui akan ditandai dengan status <em>Izin</em>.
                </p>
              </div>
            </div>

            {(currentRole === 'wali' || currentRole === 'admin') && (
              <button
                onClick={handleOpenStudentLeaveModal}
                disabled={userEligibleStudents.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajukan Izin Siswa
              </button>
            )}
          </div>

          {currentRole === 'wali' && userEligibleStudents.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Ananda terdaftar pada <strong>Paket 1 Jam</strong>. Fasilitas izin tidak tersedia
                untuk paket 1 jam sesuai ketentuan operasional klinik.
              </span>
            </div>
          )}

          {/* Daftar Permohonan Izin Siswa */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Pengajuan Izin Siswa ({studentLeaves.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Tanggal Permohonan</th>
                    <th className="px-4 py-3.5">Nama Siswa</th>
                    <th className="px-4 py-3.5">Tanggal Sesi Terapi</th>
                    <th className="px-5 py-3.5">Alasan Ketidakhadiran</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    {canReview && <th className="px-5 py-3.5 text-right">Persetujuan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {studentLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Belum ada permohonan izin siswa yang diajukan.
                      </td>
                    </tr>
                  ) : (
                    studentLeaves.map((leave) => {
                      const student = students.find((s) => s.id === leave.studentId);
                      const isPending = leave.status === 'menunggu';

                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-medium text-slate-600">
                            {leave.requestDate}
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-900">{student?.name}</td>
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {leave.sessionDate}
                          </td>
                          <td className="px-5 py-4 text-slate-600 max-w-xs">{leave.reason}</td>
                          <td className="px-4 py-4 text-center">
                            <Badge
                              variant={
                                leave.status === 'disetujui'
                                  ? 'green'
                                  : leave.status === 'ditolak'
                                  ? 'red'
                                  : 'yellow'
                              }
                            >
                              {leave.status === 'disetujui'
                                ? 'Disetujui'
                                : leave.status === 'ditolak'
                                ? 'Ditolak'
                                : 'Menunggu'}
                            </Badge>
                          </td>

                          {canReview && (
                            <td className="px-5 py-4 text-right">
                              {isPending ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      reviewStudentLeave(
                                        leave.id,
                                        'disetujui',
                                        currentUser?.fullName || 'Kepala'
                                      )
                                    }
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() =>
                                      setRejectingLeave({ id: leave.id, type: 'siswa' })
                                    }
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-2xs text-slate-400">
                                  Oleh: {leave.reviewedBy || 'Admin'}
                                </span>
                              )}
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
        </div>
      )}

      {/* TAB 2: IZIN GURU */}
      {activeTab === 'guru' && (
        <div className="space-y-4">
          <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-100 text-sky-800 rounded-xl shrink-0 mt-0.5">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                  Pengaruh Izin Guru Terhadap Penggajian
                </h4>
                <p className="text-xs text-sky-800 mt-0.5">
                  Guru yang hadir penuh sebulan tanpa izin berhak atas <strong>Bonus Kehadiran Rp 50.000</strong>.
                  Jika guru izin <strong>lebih dari 1 kali</strong> dalam sebulan, akan dikenakan potongan
                  harian per hari izin yang disetujui.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenTeacherLeaveModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajukan Izin Guru
            </button>
          </div>

          {/* Daftar Izin Guru */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Pengajuan Izin Guru ({teacherLeaves.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Nama Guru</th>
                    <th className="px-4 py-3.5">Tanggal Tidak Masuk</th>
                    <th className="px-5 py-3.5">Alasan Izin</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    {canReview && <th className="px-5 py-3.5 text-right">Persetujuan Kepala</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {teacherLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        Belum ada permohonan izin guru yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    teacherLeaves.map((leave) => {
                      const teacher = teachers.find((t) => t.id === leave.teacherId);
                      const isPending = leave.status === 'menunggu';

                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">{teacher?.name}</td>
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {leave.leaveDate}
                          </td>
                          <td className="px-5 py-4 text-slate-600 max-w-xs">{leave.reason}</td>
                          <td className="px-4 py-4 text-center">
                            <Badge
                              variant={
                                leave.status === 'disetujui'
                                  ? 'green'
                                  : leave.status === 'ditolak'
                                  ? 'red'
                                  : 'yellow'
                              }
                            >
                              {leave.status === 'disetujui'
                                ? 'Disetujui'
                                : leave.status === 'ditolak'
                                ? 'Ditolak'
                                : 'Menunggu'}
                            </Badge>
                          </td>

                          {canReview && (
                            <td className="px-5 py-4 text-right">
                              {isPending ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      reviewTeacherLeave(
                                        leave.id,
                                        'disetujui',
                                        currentUser?.fullName || 'Kepala'
                                      )
                                    }
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() =>
                                      setRejectingLeave({ id: leave.id, type: 'guru' })
                                    }
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-2xs text-slate-400">
                                  Oleh: {leave.reviewedBy || 'Kepala'}
                                </span>
                              )}
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
        </div>
      )}

      {/* Modal Ajukan Izin Siswa */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Ajukan Izin Sesi Terapi Siswa"
        subtitle="Khusus siswa paket 2 jam"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitStudentLeave} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pilih Siswa (Hanya Paket 2 Jam)
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedSessionId('');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {(userEligibleStudents.length > 0 ? userEligibleStudents : eligibleStudents).map(
                (s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({packages.find((p) => p.id === s.packageId)?.name})
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pilih Sesi yang Akan Diizinkan *
            </label>
            <select
              required
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">-- Pilih Tanggal & Jam Sesi --</option>
              {upcomingStudentSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.dayName}, {session.sessionDate} ({session.startTime} - {session.endTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Alasan Ketidakhadiran *
            </label>
            <textarea
              required
              rows={3}
              value={studentReason}
              onChange={(e) => setStudentReason(e.target.value)}
              placeholder="Contoh: Jadwal kontrol dokter spesialis anak di rumah sakit..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {studentLeaveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              {studentLeaveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStudentModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Kirim Permohonan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajukan Izin Guru */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title="Ajukan Izin Guru Terapis"
        subtitle="Izin yang disetujui akan dihitung dalam payroll bulanan"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitTeacherLeave} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Guru Terapis *
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Tanggal Izin *
            </label>
            <input
              type="date"
              required
              value={teacherLeaveDate}
              onChange={(e) => setTeacherLeaveDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Alasan Izin *
            </label>
            <textarea
              required
              rows={3}
              value={teacherReason}
              onChange={(e) => setTeacherReason(e.target.value)}
              placeholder="Contoh: Mengikuti pelatihan sertifikasi wicara anak..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Ajukan Izin
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Penolakan Izin */}
      <Modal
        isOpen={Boolean(rejectingLeave)}
        onClose={() => setRejectingLeave(null)}
        title="Tolak Pengajuan Izin"
        subtitle="Berikan keterangan alasan penolakan"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Alasan Penolakan
            </label>
            <textarea
              rows={3}
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="Contoh: Jadwal terapi sedang dalam evaluasi tengah periode..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectingLeave(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Konfirmasi Tolak Izin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
