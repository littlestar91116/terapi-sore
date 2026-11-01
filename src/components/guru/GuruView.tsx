import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Wallet,
  Clock,
  Briefcase,
  KeyRound,
  CheckCircle2,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Teacher, SalarySystem, AccountStatus, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatRupiah, terbilangRupiah } from '../../lib/numberToIndonesianWords';
import { APP_CONFIG } from '../../config/appConfig';

export const GuruView: React.FC = () => {
  const { currentRole, hasPermission, users, syncTeacherAccount } = useAuth();
  const { teachers, addTeacher, updateTeacher, deleteTeacher, financialSettings } = useData();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto Account Creation State
  const [autoCreateAccount, setAutoCreateAccount] = useState(true);
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('123');
  const [accountAlert, setAccountAlert] = useState<{
    teacherName: string;
    username: string;
    password?: string;
    position?: string;
    role: UserRole;
    isEdit: boolean;
  } | null>(null);

  const canAdd = hasPermission('guru', 'add');
  const canEdit = hasPermission('guru', 'edit');
  const canDelete = hasPermission('guru', 'delete');

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    joinDate: string;
    status: AccountStatus;
    salarySystem: SalarySystem;
    hourlyRate: number;
    monthlySalary: number;
    position: string;
    role: UserRole;
  }>({
    name: '',
    phone: '',
    address: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'aktif',
    salarySystem: 'per_jam',
    hourlyRate: financialSettings.defaultHourlyRate || 20000,
    monthlySalary: 3000000,
    position: 'Guru Terapis',
    role: 'guru',
  });

  const handlePositionChange = (pos: string) => {
    let deducedRole: UserRole = 'guru';
    if (pos.toLowerCase().includes('kepala')) {
      deducedRole = 'kepala';
    } else if (pos.toLowerCase().includes('admin')) {
      deducedRole = 'admin';
    }

    setFormData((prev) => ({
      ...prev,
      position: pos,
      role: deducedRole,
    }));

    // Update username suggestion jika baru
    if (!editingTeacher && formData.name) {
      const clean = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const prefix = deducedRole === 'kepala' ? 'kpl_' : deducedRole === 'admin' ? 'adm_' : 'guru_';
      setTeacherUsername(`${prefix}${clean || 'staf'}`);
    }
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, name: val }));
    if (!editingTeacher) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const prefix =
        formData.role === 'kepala' ? 'kpl_' : formData.role === 'admin' ? 'adm_' : 'guru_';
      setTeacherUsername(clean ? `${prefix}${clean}` : '');
    }
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'aktif',
      salarySystem: 'per_jam',
      hourlyRate: financialSettings.defaultHourlyRate || 20000,
      monthlySalary: 3000000,
      position: 'Guru Terapis',
      role: 'guru',
    });
    setAutoCreateAccount(true);
    setTeacherUsername('');
    setTeacherPassword('123');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    const existingPosition = teacher.position || 'Guru Terapis';
    const existingRole = teacher.role || (existingPosition.toLowerCase().includes('kepala') ? 'kepala' : 'guru');

    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      address: teacher.address,
      joinDate: teacher.joinDate,
      status: teacher.status,
      salarySystem: teacher.salarySystem,
      hourlyRate: teacher.hourlyRate,
      monthlySalary: teacher.monthlySalary,
      position: existingPosition,
      role: existingRole,
    });

    const linkedUser = users.find(
      (u) =>
        (teacher.userId && u.id === teacher.userId) ||
        (u.teacherId && u.teacherId === teacher.id) ||
        (u.phone && teacher.phone && u.phone === teacher.phone) ||
        (u.fullName.toLowerCase() === teacher.name.toLowerCase() &&
          (u.role === 'guru' || u.role === 'kepala' || u.role === 'admin'))
    );

    setAutoCreateAccount(true);
    setTeacherUsername(linkedUser?.username || '');
    setTeacherPassword(linkedUser?.password || '123');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTeacher) {
      let updatedTeacher: Teacher = {
        ...editingTeacher,
        ...formData,
      };

      if (autoCreateAccount) {
        const synced = syncTeacherAccount(updatedTeacher, {
          username: teacherUsername,
          password: teacherPassword,
          role: formData.role,
          position: formData.position,
        });
        updatedTeacher.userId = synced.id;
        setAccountAlert({
          teacherName: updatedTeacher.name,
          username: synced.username,
          password: teacherPassword || '123',
          position: formData.position,
          role: formData.role,
          isEdit: true,
        });
      }

      updateTeacher(updatedTeacher);
    } else {
      const newId = `GUR-${Date.now().toString(36).toUpperCase()}`;
      let newTeacher: Teacher = {
        id: newId,
        ...formData,
      };

      if (autoCreateAccount) {
        const synced = syncTeacherAccount(newTeacher, {
          username: teacherUsername,
          password: teacherPassword,
          role: formData.role,
          position: formData.position,
        });
        newTeacher.userId = synced.id;
        setAccountAlert({
          teacherName: newTeacher.name,
          username: synced.username,
          password: teacherPassword || '123',
          position: formData.position,
          role: formData.role,
          isEdit: false,
        });
      }

      addTeacher(newTeacher);
    }
    setIsModalOpen(false);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Data Guru & Sistem Gaji
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar tenaga ahli terapi dengan pilihan skema penggajian per jam terapi atau gaji tetap bulanan.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Guru Baru
          </button>
        )}
      </div>

      {/* Success Alert: Akun Otomatis Dibuat / Disinkronkan */}
      {accountAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-950 space-y-1">
              <h4 className="font-bold text-sm">
                {accountAlert.isEdit
                  ? 'Akun Tenaga Ahli Berhasil Disinkronkan!'
                  : 'Akun Pengguna Berhasil Dibuat Otomatis!'}
              </h4>
              <p className="text-emerald-800">
                Data <strong>{accountAlert.teacherName}</strong> telah tersimpan dengan jabatan{' '}
                <strong className="text-emerald-950 underline">{accountAlert.position}</strong> (Peran:{' '}
                <strong className="capitalize">{accountAlert.role}</strong>). Akun langsung aktif
                dan dapat digunakan untuk login:
              </p>
              <div className="inline-flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 font-mono text-xs text-slate-800 mt-1">
                <span>
                  Username: <strong className="text-emerald-700">@{accountAlert.username}</strong>
                </span>
                <span>•</span>
                <span>
                  Password: <strong className="text-emerald-700">{accountAlert.password || '123'}</strong>
                </span>
                <span>•</span>
                <span>
                  Peran: <strong className="text-purple-700 uppercase">{accountAlert.role}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAccountAlert(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama guru, kontak, atau alamat..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Grid Guru */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const linkedUser = users.find(
            (u) =>
              (teacher.userId && u.id === teacher.userId) ||
              (u.teacherId && u.teacherId === teacher.id) ||
              (u.phone && teacher.phone && u.phone === teacher.phone) ||
              (u.fullName.toLowerCase() === teacher.name.toLowerCase() &&
                (u.role === 'guru' || u.role === 'kepala' || u.role === 'admin'))
          );

          const teacherRole = teacher.role || linkedUser?.role || 'guru';
          const teacherPos = teacher.position || linkedUser?.position || 'Guru Terapis';

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{teacher.name}</h3>
                    <div className="text-2xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>Bergabung: {teacher.joinDate}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      teacher.status === 'aktif'
                        ? 'green'
                        : teacher.status === 'cuti'
                        ? 'yellow'
                        : 'red'
                    }
                  >
                    {teacher.status}
                  </Badge>
                </div>

                {/* Badges Jabatan & Peran Akun */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-2xs font-bold border border-teal-200">
                    <Briefcase className="w-3 h-3 text-teal-600" />
                    {teacherPos}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-3xs font-bold uppercase border border-purple-200">
                    <Shield className="w-2.5 h-2.5 text-purple-600" />
                    Peran: {teacherRole}
                  </span>
                  {linkedUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-3xs font-semibold">
                      <KeyRound className="w-2.5 h-2.5 text-slate-500" />
                      @{linkedUser.username}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.phone || '-'}</span>
                  </div>
                  <p className="text-slate-500 line-clamp-2 text-2xs">{teacher.address || '-'}</p>
                </div>

                {/* Box Skema Gaji */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <div className="flex items-center justify-between text-2xs font-semibold text-slate-500">
                    <span>Sistem Gaji:</span>
                    <span className="uppercase text-slate-800 font-bold">
                      {teacher.salarySystem === 'per_jam' ? 'Per Jam Terapi' : 'Gaji Bulanan'}
                    </span>
                  </div>
                  <div className="text-base font-black text-emerald-700">
                    {teacher.salarySystem === 'per_jam'
                      ? `${formatRupiah(teacher.hourlyRate)} / jam`
                      : `${formatRupiah(teacher.monthlySalary)} / bulan`}
                  </div>
                </div>
              </div>

              {/* Aksi */}
              {(canEdit || canDelete) && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(teacher)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Data & Akun
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteConfirmId(teacher.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus Guru"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Guru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? 'Edit Data Guru & Tarif' : 'Tambah Guru Terapis'}
        subtitle="Atur identitas guru serta pilihan skema gaji per jam atau bulanan"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nama Lengkap & Gelar *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Siti Rahmawati, S.Tr.Kes"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Pilihan Jabatan & Peran Akun Sistem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Pilihan Jabatan / Posisi *
              </label>
              <select
                value={formData.position}
                onChange={(e) => handlePositionChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer font-semibold text-slate-800"
              >
                <option value="Guru Terapis">Guru Terapis</option>
                <option value="Terapis Wicara">Terapis Wicara</option>
                <option value="Terapis Okupasi">Terapis Okupasi</option>
                <option value="Terapis Sensori Integrasi">Terapis Sensori Integrasi</option>
                <option value="Kepala Terapi / Koordinator">Kepala Terapi / Koordinator</option>
                <option value="Kepala Lembaga">Kepala Lembaga</option>
                <option value="Administrator Lembaga">Administrator Lembaga</option>
                <option value="Staf Administrasi & Keuangan">Staf Administrasi & Keuangan</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Peran Akun Sistem (Hak Akses) *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-xs bg-purple-50 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer font-bold text-purple-900"
              >
                <option value="guru">Peran Guru (Jadwal, Absensi, Izin Guru, Slip Gaji)</option>
                <option value="kepala">Peran Kepala (Verifikasi Izin, Tarif & Gaji, Pembayaran)</option>
                <option value="admin">Peran Admin (Akses Penuh Seluruh Modul)</option>
              </select>
            </div>
          </div>

          {/* Section Pembuatan & Sinkronisasi Akun Login Guru/Staf Otomatis */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  Akun Login Pengguna (Otomatis)
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-2xs font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoCreateAccount}
                  onChange={(e) => setAutoCreateAccount(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Otomatis Buat & Sinkron Akun</span>
              </label>
            </div>

            {autoCreateAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-3xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Username Pengguna (Login) *
                  </label>
                  <input
                    type="text"
                    required={autoCreateAccount}
                    value={teacherUsername}
                    onChange={(e) => setTeacherUsername(e.target.value)}
                    placeholder="Contoh: guru_siti"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Kata Sandi / Password *
                  </label>
                  <input
                    type="text"
                    required={autoCreateAccount}
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="Password login..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            )}
            <p className="text-3xs text-emerald-700 leading-relaxed">
              Akun login otomatis terdaftar dan tersinkronisasi. Pengguna dapat langsung masuk ke sistem
              sesuai hak akses peran yang dipilih di atas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nomor HP / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081234567890"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tanggal Bergabung
              </label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Alamat Domisili
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Alamat lengkap guru..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Pengaturan Skema Gaji */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900">
              Pilihan Sistem Gaji (Dapat Diedit Admin & Kepala) *
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-colors ${
                  formData.salarySystem === 'per_jam'
                    ? 'bg-white border-emerald-500 shadow-2xs ring-1 ring-emerald-500'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="salarySystem"
                    value="per_jam"
                    checked={formData.salarySystem === 'per_jam'}
                    onChange={() => setFormData({ ...formData, salarySystem: 'per_jam' })}
                    className="text-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Per Jam Terapi</span>
                </div>
                <span className="text-3xs text-slate-500 pl-5">
                  Dihitung dari total jam terapi yang diajar riil (status Hadir)
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-colors ${
                  formData.salarySystem === 'bulanan'
                    ? 'bg-white border-emerald-500 shadow-2xs ring-1 ring-emerald-500'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="salarySystem"
                    value="bulanan"
                    checked={formData.salarySystem === 'bulanan'}
                    onChange={() => setFormData({ ...formData, salarySystem: 'bulanan' })}
                    className="text-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Bulanan Tetap</span>
                </div>
                <span className="text-3xs text-slate-500 pl-5">
                  Gaji pokok dengan nominal tetap setiap bulannya
                </span>
              </label>
            </div>

            {formData.salarySystem === 'per_jam' ? (
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tarif Gaji Per Jam (Rp)
                </label>
                <input
                  type="number"
                  step={1000}
                  value={formData.hourlyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
                <span className="text-2xs text-slate-500 mt-1 block">
                  Nilai terformat: <strong>{formatRupiah(formData.hourlyRate)}</strong> per jam
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nominal Gaji Tetap Bulanan (Rp)
                </label>
                <input
                  type="number"
                  step={50000}
                  value={formData.monthlySalary}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
                <span className="text-2xs text-slate-500 mt-1 block">
                  Nilai terformat: <strong>{formatRupiah(formData.monthlySalary)}</strong> per bulan
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {editingTeacher ? 'Simpan Perubahan' : 'Tambah Guru'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteTeacher(deleteConfirmId);
        }}
        title="Hapus Data Guru"
        message="Apakah Anda yakin ingin menghapus guru ini dari sistem? Pastikan tidak ada jadwal aktif yang tertaut."
        confirmLabel="Hapus Permanen"
        isDestructive
      />
    </div>
  );
};
