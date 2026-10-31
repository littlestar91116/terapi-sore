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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Teacher, SalarySystem, AccountStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatRupiah } from '../../lib/numberToIndonesianWords';

export const GuruView: React.FC = () => {
  const { currentRole, hasPermission } = useAuth();
  const { teachers, addTeacher, updateTeacher, deleteTeacher, financialSettings } = useData();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  }>({
    name: '',
    phone: '',
    address: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'aktif',
    salarySystem: 'per_jam',
    hourlyRate: financialSettings.defaultHourlyRate || 20000,
    monthlySalary: 3000000,
  });

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
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      address: teacher.address,
      joinDate: teacher.joinDate,
      status: teacher.status,
      salarySystem: teacher.salarySystem,
      hourlyRate: teacher.hourlyRate,
      monthlySalary: teacher.monthlySalary,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTeacher) {
      updateTeacher({
        ...editingTeacher,
        ...formData,
      });
    } else {
      const newTeacher: Teacher = {
        id: `GUR-${Date.now().toString(36).toUpperCase()}`,
        ...formData,
      };
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
        {filteredTeachers.map((teacher) => (
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

              <div className="space-y-1.5 text-xs text-slate-600">
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
                    Edit Tarif & Data
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
        ))}
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Siti Rahmawati, S.Tr.Kes"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
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
